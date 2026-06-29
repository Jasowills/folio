import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const sections = {
  privacy: {
    title: 'Privacy Policy',
    content: [
      {
        h: 'Information We Collect',
        p: 'We collect information you provide directly: name, email address, and resume data (work history, education, skills). When you upload a resume, we extract and store structured fields from its text content. We also collect usage data such as page views and feature interactions to improve the service.',
      },
      {
        h: 'How We Use Your Information',
        p: 'Your data powers the core features: resume parsing, ATS scoring, cover letter generation, portfolio analysis, and bullet rewriting. We use your email for account management and authentication. Aggregated, anonymized data helps us improve parsing accuracy and feature quality.',
      },
      {
        h: 'AI Processing',
        p: 'Certain features (ATS scoring, resume review, bullet rewriting, cover letter generation) use third-party AI models via OpenRouter. Data sent to these models is processed transiently and is not used for model training. Resume extraction and parsing are performed entirely by deterministic rules — no AI is involved in reading or structuring your document.',
      },
      {
        h: 'Data Storage & Security',
        p: 'Your data is stored on MongoDB Atlas (US region). Resume files are stored on Cloudinary. We use encryption in transit (TLS) and at rest. Passwords are hashed with bcrypt. Access tokens expire after 15 minutes; refresh tokens after 7 days.',
      },
      {
        h: 'Data Retention',
        p: 'We retain your data for as long as your account is active. If you delete your account, all associated data (resumes, cover letters, ATS results, portfolio analyses) is permanently deleted within 30 days.',
      },
      {
        h: 'Third-Party Services',
        p: 'We integrate with: Google (OAuth authentication), Cloudinary (file storage), OpenRouter (AI inference), and MongoDB Atlas (database). Each service has its own privacy policy governing data handling.',
      },
      {
        h: 'Your Rights',
        p: 'You can access, update, or delete your data at any time through your account settings. To request a full data export, contact us. You may also disable cookies in your browser settings, though this may affect functionality.',
      },
      {
        h: 'Cookies',
        p: 'We use essential cookies for authentication (refresh token cookie, HTTP-only). No third-party tracking cookies are used. We do not sell your personal data.',
      },
      {
        h: 'Changes to This Policy',
        p: 'We may update this policy. Material changes will be notified via email or an in-app notice. Continued use after changes constitutes acceptance.',
      },
      {
        h: 'Contact',
        p: 'For privacy inquiries, contact support@folio.com.',
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    content: [
      {
        h: 'Acceptance of Terms',
        p: 'By using Folio &, you agree to these terms. If you do not agree, do not use the service.',
      },
      {
        h: 'Account Registration',
        p: 'You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.',
      },
      {
        h: 'Subscription & Billing',
        p: 'Folio & offers a free tier with limited features and paid plans with additional capabilities. Paid plans are billed monthly or annually as selected. Cancellation takes effect at the end of the current billing period. Refunds are provided at our discretion.',
      },
      {
        h: 'Acceptable Use',
        p: 'You agree not to: upload malicious content, attempt to access other users\' data, reverse-engineer the service, use the service for unlawful purposes, or submit false or misleading information.',
      },
      {
        h: 'Intellectual Property',
        p: 'You retain full ownership of your resume and other content you upload. Folio & owns the service, its codebase, branding, and generated UI/output templates. We do not claim ownership over your data.',
      },
      {
        h: 'Service Availability',
        p: 'We strive for high availability but do not guarantee uninterrupted service. We may perform maintenance with reasonable notice. We are not liable for service interruptions beyond our control.',
      },
      {
        h: 'Limitation of Liability',
        p: 'Folio & is provided "as is" without warranties of any kind. We are not liable for damages arising from use of the service, including lost opportunities due to resume or ATS scoring results. AI-generated content (cover letters, rewrites, scores) should be reviewed before use.',
      },
      {
        h: 'Termination',
        p: 'We may suspend or terminate accounts for violation of these terms. You may terminate your account at any time via settings. Upon termination, your data will be deleted per our privacy policy.',
      },
      {
        h: 'Governing Law',
        p: 'These terms are governed by the laws of the State of Delaware, USA. Disputes shall be resolved in the courts of Delaware.',
      },
      {
        h: 'Changes to Terms',
        p: 'We may modify these terms with 30 days\' notice via email or in-app notification. Continued use after changes take effect constitutes acceptance.',
      },
    ],
  },
}

export default function Legal() {
  const location = useLocation()
  const section = location.pathname === '/terms' ? 'terms' : 'privacy'
  const data = sections[section]

  return (
    <div className="min-h-screen bg-paper">
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-2">
            <Link to="/" className="text-sm text-teal hover:underline font-medium">
              &larr; Home
            </Link>
          </div>
          <div className="page-header">
            <h1 className="page-title">{data.title}</h1>
            <p className="page-subtitle">
              Last updated: June 1, 2026
            </p>
          </div>

          <div className="flex gap-1 mb-8 p-1 bg-paper-dark/50 rounded-lg w-fit">
            <Link
              to="/privacy"
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                section === 'privacy'
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                section === 'terms'
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Terms
            </Link>
          </div>

          <div className="space-y-8">
            {data.content.map((item) => (
              <div key={item.h}>
                <h2 className="font-display text-h4 text-ink mb-2">{item.h}</h2>
                <p className="text-sm text-muted leading-relaxed">{item.p}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted">
              Questions? Email{' '}
              <a href="mailto:support@folio.com" className="text-teal hover:underline">
                support@folio.com
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
