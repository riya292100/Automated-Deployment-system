require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const logger = require('./logger').child('Storage');

// Try importing AWS S3 SDK if available
let S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command;
try {
  const s3Sdk = require('@aws-sdk/client-s3');
  S3Client = s3Sdk.S3Client;
  PutObjectCommand = s3Sdk.PutObjectCommand;
  GetObjectCommand = s3Sdk.GetObjectCommand;
  ListObjectsV2Command = s3Sdk.ListObjectsV2Command;
} catch (e) {
  // Fallback to local storage if AWS SDK isn't loaded
}

class StorageService {
  constructor() {
    this.mode = process.env.STORAGE_MODE || (process.env.AWS_ACCESS_KEY_ID ? 'aws' : 'local');
    this.bucketName = process.env.AWS_S3_BUCKET || 'automated-deployment-bucket';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.localStorageDir = path.resolve(__dirname, '../storage/s3-bucket');

    // Ensure local storage directory exists
    if (!fs.existsSync(this.localStorageDir)) {
      fs.mkdirSync(this.localStorageDir, { recursive: true });
    }

    if (this.mode === 'aws' && S3Client && process.env.AWS_ACCESS_KEY_ID) {
      try {
        this.s3Client = new S3Client({
          region: this.region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });
        logger.info(`Configured with AWS S3 Bucket: ${this.bucketName} (${this.region})`);
      } catch (err) {
        logger.warn(`Failed to init AWS S3 Client, defaulting to Local Storage. Error: ${err.message}`);
        this.mode = 'local';
      }
    } else {
      this.mode = 'local';
      logger.info(`Running in Local Storage Mode at: ${this.localStorageDir}`);
    }
  }

  getMode() {
    return this.mode;
  }

  setMode(mode, awsConfig = {}) {
    this.mode = mode;
    if (mode === 'aws' && S3Client && awsConfig.accessKeyId) {
      this.bucketName = awsConfig.bucket || this.bucketName;
      this.region = awsConfig.region || this.region;
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: awsConfig.accessKeyId,
          secretAccessKey: awsConfig.secretAccessKey,
        },
      });
      logger.info(`Switched to AWS S3: ${this.bucketName}`);
    } else {
      this.mode = 'local';
      logger.info(`Switched to Local S3 Emulation`);
    }
  }

  /**
   * Put Object into storage
   * @param {string} key - S3 Key (e.g. '__outputs/project-slug/index.html')
   * @param {Buffer|string} content - File data
   * @param {string} contentType - MIME type
   */
  async putObject(key, content, contentType) {
    const mimeType = contentType || mime.lookup(key) || 'application/octet-stream';

    if (this.mode === 'aws' && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: mimeType,
      });
      return await this.s3Client.send(command);
    } else {
      // Local S3 simulation
      const localFilePath = path.join(this.localStorageDir, key);
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localFilePath, content);
      return { ETag: `"${Date.now()}"`, Key: key, ContentType: mimeType };
    }
  }

  /**
   * Get Object from storage
   * @param {string} key - S3 Key
   * @returns {Promise<{ body: Buffer, contentType: string, contentLength: number }>}
   */
  async getObject(key) {
    if (this.mode === 'aws' && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      const streamToBuffer = async (stream) => {
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
      };
      const body = await streamToBuffer(response.Body);
      return {
        body,
        contentType: response.ContentType || mime.lookup(key) || 'application/octet-stream',
        contentLength: response.ContentLength || body.length,
      };
    } else {
      const localFilePath = path.join(this.localStorageDir, key);
      if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).isDirectory()) {
        const err = new Error('NoSuchKey: The specified key does not exist.');
        err.code = 'NoSuchKey';
        throw err;
      }
      const body = fs.readFileSync(localFilePath);
      const contentType = mime.lookup(localFilePath) || 'application/octet-stream';
      return {
        body,
        contentType,
        contentLength: body.length,
      };
    }
  }

  /**
   * List all objects for a given prefix
   * @param {string} prefix 
   */
  async listObjects(prefix = '') {
    if (this.mode === 'aws' && this.s3Client) {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });
      const response = await this.s3Client.send(command);
      return (response.Contents || []).map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      }));
    } else {
      const results = [];
      const baseDir = path.join(this.localStorageDir, prefix);
      
      const scanDir = (currentDir, relativePrefix) => {
        if (!fs.existsSync(currentDir)) return;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          const relPath = path.join(relativePrefix, entry.name).replace(/\\/g, '/');
          if (entry.isDirectory()) {
            scanDir(fullPath, relPath);
          } else {
            const stats = fs.statSync(fullPath);
            results.push({
              key: (prefix ? prefix.replace(/\/$/, '') + '/' : '') + relPath,
              size: stats.size,
              lastModified: stats.mtime,
            });
          }
        }
      };

      if (fs.existsSync(baseDir) && fs.statSync(baseDir).isDirectory()) {
        scanDir(baseDir, '');
      } else {
        scanDir(this.localStorageDir, '');
      }
      return results.filter(item => item.key.startsWith(prefix));
    }
  }

  /**
   * Recursively upload a directory to storage
   * @param {string} sourceDir - Local folder to upload
   * @param {string} destinationPrefix - Destination S3 key prefix (e.g. '__outputs/my-app')
   */
  async uploadDirectory(sourceDir, destinationPrefix, onFileUploaded) {
    const uploadedFiles = [];
    
    const walkAndUpload = async (currentDir, relativePath = '') => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const rel = path.join(relativePath, entry.name).replace(/\\/g, '/');
        
        if (entry.isDirectory()) {
          await walkAndUpload(fullPath, rel);
        } else {
          const s3Key = `${destinationPrefix.replace(/\/$/, '')}/${rel}`;
          const content = fs.readFileSync(fullPath);
          const contentType = mime.lookup(fullPath) || 'application/octet-stream';
          
          await this.putObject(s3Key, content, contentType);
          uploadedFiles.push({ key: s3Key, size: content.length, mimeType: contentType });
          
          if (typeof onFileUploaded === 'function') {
            onFileUploaded(s3Key, content.length);
          }
        }
      }
    };

    await walkAndUpload(sourceDir);
    return uploadedFiles;
  }
}

const storageInstance = new StorageService();
module.exports = storageInstance;
