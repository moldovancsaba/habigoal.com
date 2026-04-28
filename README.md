# KIDEX

KIDEX is a conductor-facing survey and reporting app for recording data required during KIDEX child examinations.

The app supports:

- Rapid KRAS 12-factor assessments
- Full KIDEX 50-factor assessments
- bio-psycho-social weighted scoring and SKI calculation
- MongoDB Atlas persistence
- consent-gated evidence image uploads through ImgBB
- Vercel deployment as a single Next.js application from the repository root

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

`IMGBB_API_KEY` is used only server-side by `/api/uploads/imgbb`.

## Data Storage

Assessments are stored in MongoDB Atlas in the `assessments` collection.

Images are uploaded to ImgBB. The returned URL metadata is stored on the assessment record.
