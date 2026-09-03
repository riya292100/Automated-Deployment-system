const { z } = require('zod');

/**
 * Validation schema for POST /api/deploy
 */
const deploySchema = z
  .object({
    gitUrl: z
      .string()
      .url('gitUrl must be a valid URL (e.g. https://github.com/user/repo)')
      .optional()
      .or(z.literal('')),
    templateId: z
      .enum([
        'modern-landing-page',
        'react-vite-app',
        'analytics-dashboard',
        'vue-vite-app',
        'python-web-app',
        'rust-wasm-app',
        '',
      ])
      .optional(),
    projectName: z
      .string()
      .min(1, 'projectName must be at least 1 character')
      .max(64, 'projectName must not exceed 64 characters')
      .regex(
        /^[a-zA-Z0-9-_ ]+$/,
        'projectName can only contain alphanumeric characters, hyphens, and underscores'
      )
      .optional(),
    branch: z.string().min(1).max(100).default('main').optional(),
    buildCommand: z.string().max(500).optional().or(z.literal('')),
    installCommand: z.string().max(500).optional().or(z.literal('')),
    outputDir: z.string().max(200).default('dist').optional(),
  })
  .refine(
    (data) => {
      const hasGit = Boolean(data.gitUrl && data.gitUrl.trim().length > 0);
      const hasTemplate = Boolean(data.templateId && data.templateId.trim().length > 0);
      return hasGit || hasTemplate;
    },
    {
      message: 'Must provide either a valid gitUrl or a starter templateId',
      path: ['gitUrl'],
    }
  );

/**
 * Validation schema for POST /api/config/storage
 */
const storageConfigSchema = z.object({
  mode: z.enum(['local', 'aws'], {
    errorMap: () => ({ message: "Mode must be either 'local' or 'aws'" }),
  }),
  awsConfig: z
    .object({
      bucket: z.string().optional(),
      region: z.string().optional(),
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional(),
    })
    .optional(),
});

/**
 * Validation schema for redeployment request parameters
 */
const redeployParamsSchema = z.object({
  deploymentId: z.string().min(3, 'Invalid deploymentId parameter'),
});

/**
 * Validation schema for POST /api/deploy/direct (Drag & Drop or direct file upload)
 */
const directDeploySchema = z
  .object({
    projectName: z
      .string()
      .min(1, 'projectName is required and cannot be empty')
      .max(64, 'projectName must not exceed 64 characters')
      .regex(
        /^[a-zA-Z0-9-_ ]+$/,
        'projectName can only contain alphanumeric characters, hyphens, and underscores'
      ),
    files: z
      .array(
        z.object({
          path: z.string().optional(),
          name: z.string().optional(),
          content: z.string().default(''),
        })
      )
      .optional(),
    html: z.string().optional(),
    css: z.string().optional(),
    js: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasFiles = Array.isArray(data.files) && data.files.length > 0;
      const hasHtml = typeof data.html === 'string' && data.html.trim().length > 0;
      return hasFiles || hasHtml;
    },
    {
      message: 'Either files array or html content must be provided',
      path: ['files'],
    }
  );

/**
 * Validation schema for generic deploymentId route param
 */
const deploymentIdParamSchema = z.object({
  deploymentId: z
    .string()
    .min(3, 'deploymentId must be at least 3 characters')
    .max(100, 'deploymentId must not exceed 100 characters'),
});

module.exports = {
  deploySchema,
  directDeploySchema,
  storageConfigSchema,
  redeployParamsSchema,
  deploymentIdParamSchema,
};
