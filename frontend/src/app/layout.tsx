import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DeployLLM - AI Model Marketplace',
  description: 'Deploy optimized LLMs to AWS, GCP, or locally',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
