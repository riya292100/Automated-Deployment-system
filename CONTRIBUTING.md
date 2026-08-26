# Contributing to Automated Deployment System

Thank you for your interest in contributing! We welcome bug reports, feature requests, documentation improvements, and code contributions.

---

## 🛠️ Development Workflow

### 1. Clone & Setup
```bash
git clone https://github.com/riya292100/Automated-Deployment-system.git
cd Automated-Deployment-system
npm ci
cp .env.example .env
```

### 2. Launch Local Environment
```bash
npm start
```
The Dashboard will be accessible at `http://localhost:9000` and the S3 Reverse Proxy at `http://localhost:8000`.

---

## 🧪 Code Quality & Testing Guidelines

All contributions must meet our quality and test coverage standards:

### Run Tests
```bash
# Run unit & integration test suite
npm test

# Run tests with coverage threshold enforcement (>70%)
npm run test:coverage
```

### Code Style & Linting
```bash
# Run ESLint validation
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Check formatting with Prettier
npm run format:check

# Auto-format all code
npm run format
```

---

## 📝 Commit Convention

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` A new feature
- `fix:` A bug fix
- `refactor:` Code restructuring without changing external behavior
- `test:` Adding or updating tests
- `docs:` Documentation updates
- `ci:` Changes to CI/CD workflows and tooling
- `chore:` Maintenance tasks, dependency updates, and configuration

---

## 🚀 Pull Request Checklist

Before submitting a Pull Request:
1. Ensure all tests pass (`npm test`).
2. Ensure code passes lint and formatting checks (`npm run lint` and `npm run format:check`).
3. Pair new features or bug fixes with tests in `tests/`.
4. Keep PRs small, focused, and well-described.
