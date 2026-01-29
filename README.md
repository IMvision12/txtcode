# DeployLLM - AI Model Marketplace & Deployment Platform

Deploy optimized LLMs from Hugging Face to AWS, GCP, or locally with automatic quantization, LoRA fine-tuning, and vLLM optimization.

## Features

- **Model Browser**: Browse and search popular LLMs from Hugging Face
- **Flexible Deployment**: Deploy to AWS, GCP, or local infrastructure
- **Optimization Pipeline**:
  - BitsAndBytes quantization (4-bit/8-bit)
  - LoRA fine-tuning
  - vLLM compilation for efficient inference
- **Real-time Monitoring**: Track deployment progress with WebSocket updates
- **Cost Estimation**: Preview cloud deployment costs (coming soon)

## Architecture

```
├── frontend/          # Next.js React application
│   ├── src/
│   │   ├── app/       # Next.js app router pages
│   │   ├── components/# React components
│   │   ├── lib/       # API and socket clients
│   │   └── store/     # Zustand state management
│
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   │   ├── cloud/ # AWS, GCP, Local deployment
│   │   │   ├── deployment.ts
│   │   │   ├── queue.ts
│   │   │   └── huggingface.ts
│   │   └── index.ts
│
└── docker-compose.yml # Container orchestration
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Redis (included in docker-compose)
- AWS/GCP credentials (for cloud deployments)

### Installation

1. Clone the repository:
```bash
cd infer
```

2. Copy environment variables:
```bash
copy .env.example .env
```

3. Configure your credentials in `.env`:
   - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for AWS
   - GCP_PROJECT_ID and GCP_KEY_FILE for GCP
   - HUGGINGFACE_TOKEN for model access

4. Install dependencies:
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..
```

### Development

Run with Docker Compose:
```bash
docker-compose up
```

Or run locally:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Redis
redis-server
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Usage

1. **Browse Models**: Search and select an LLM from the model browser
2. **Configure Deployment**:
   - Choose target: AWS, GCP, or Local
   - Select optimizations: quantization, LoRA, vLLM
3. **Deploy**: Monitor real-time progress as your model is optimized and deployed
4. **Access Endpoint**: Use the provided endpoint for inference

## API Endpoints

### Models
- `GET /api/models/popular` - Get popular models
- `GET /api/models/search?query=` - Search models

### Deployments
- `POST /api/deployments` - Create deployment job
- `GET /api/deployments/:jobId` - Get deployment status

### WebSocket Events
- `deployment:progress` - Real-time progress updates
- `deployment:complete` - Deployment success
- `deployment:failed` - Deployment failure

## Extending the Platform

### Adding New Cloud Providers

Create a new file in `backend/src/services/cloud/`:

```typescript
import { DeploymentConfig, ProgressCallback } from '../deployment';

export async function deployToProvider(
  config: DeploymentConfig,
  onProgress: ProgressCallback
) {
  // Implementation
}
```

### Custom Optimizations

Extend `backend/src/services/deployment.ts` to add new optimization steps.

### Frontend Customization

Components are in `frontend/src/components/`. Modify or create new components as needed.

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Socket.IO Client
- Axios

**Backend:**
- Node.js
- Express
- TypeScript
- Socket.IO
- Bull (job queue)
- Redis
- AWS SDK
- Google Cloud SDK

## Security Notes

- Never commit `.env` files
- Use IAM roles with minimal permissions for cloud deployments
- Implement authentication before production use
- Models and datasets are not persisted unnecessarily
- Validate all user inputs

## Roadmap

- [ ] User authentication and authorization
- [ ] Cost estimation for cloud deployments
- [ ] LangChain pipeline builder (drag-and-drop)
- [ ] Model performance benchmarking
- [ ] Multi-region deployment support
- [ ] Custom model upload
- [ ] Fine-tuning dataset management
- [ ] API key management for deployed models
- [ ] Usage analytics and monitoring

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a PR.
