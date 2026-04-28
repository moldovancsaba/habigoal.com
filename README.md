# KIDEX

KIDEX is a conductor-facing survey and reporting app for recording data required during child examinations.

The app supports:

- **Rapid KRAS** 12-factor assessments
- **Full KIDEX** 50-factor assessments
- **Bio-psycho-social** weighted scoring and SKI calculation
- **Multilingual** support (Hungarian & English)
- **Secure Evidence Storage** for examination photos/videos

## Software Versions

- **Next.js**: 15.1.4
- **React**: 19.0.0
- **TypeScript**: 5.7.3
- **MongoDB**: 6.12.0
- **Node.js**: >= 22

For the future vision of the project, see the [Product Roadmap](ROADMAP.md).

## Local Development

```bash
cp .env.example .env.local
npm install
npm run db:setup
npm run dev
```

## Required Environment Variables

```txt
MONGODB_URI=
MONGODB_DB=kidex
IMGBB_API_KEY=
```

## Data Privacy

Assessments are stored securely. Images are handled through a dedicated image processing service, and only the secure URL metadata is stored on the assessment record.
