'use client'

const AGREEMENT_KEY = 'warren_creator_agreed'

export function hasAgreedToCreatorTerms(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(AGREEMENT_KEY) === 'true'
}

export function setCreatorAgreed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AGREEMENT_KEY, 'true')
}

interface CreatorAgreementDialogProps {
  onAgree: () => void
  onDisagree?: () => void
}

export default function CreatorAgreementDialog({ onAgree, onDisagree }: CreatorAgreementDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">Creator Content Agreement</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-300 space-y-4">
          <p>By uploading content to Warren Media, you agree to the following terms:</p>

          <section>
            <h2 className="font-semibold text-white mb-2">Ownership & Rights</h2>
            <p className="mb-2">You represent and warrant that you own or control 100% of all rights necessary to distribute the uploaded content, including but not limited to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Master recording rights</li>
              <li>Publishing/composition rights</li>
              <li>Synchronization rights (if applicable)</li>
              <li>Visual footage rights</li>
              <li>Performance rights</li>
            </ul>
            <p className="mt-2">You confirm that your content does not infringe upon the rights of any third party.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">License Grant to Warren Media</h2>
            <p className="mb-2">By uploading content, you grant Warren Media a non-exclusive, worldwide, royalty-bearing license to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Host</li>
              <li>Stream</li>
              <li>Distribute</li>
              <li>Promote</li>
              <li>Monetize</li>
            </ul>
            <p className="mt-2">the content on the Warren Media platform and associated digital channels.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">Revenue Share</h2>
            <p>If monetization is enabled, revenue generated from advertising associated with your content will be shared according to the agreed revenue structure published by Warren Media. Warren Media reserves the right to modify revenue terms with notice.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">Content Standards</h2>
            <p className="mb-2">Content must not include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Copyrighted material you do not own or control</li>
              <li>Unlicensed beats or instrumentals</li>
              <li>Unapproved cover songs</li>
              <li>Explicit illegal content</li>
              <li>Hate speech or incitement</li>
              <li>Fraudulent or misleading claims</li>
            </ul>
            <p className="mt-2">Warren Media reserves the right to remove content that violates these standards.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">DMCA & Copyright</h2>
            <p>If a valid copyright claim is received, Warren Media may remove your content and notify you. Repeated copyright violations may result in account suspension or termination.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">Indemnification</h2>
            <p>You agree to indemnify and hold harmless Warren Media from any claims, damages, losses, or legal expenses arising from content you upload.</p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">Termination</h2>
            <p>Warren Media may remove content or terminate accounts at its discretion if terms are violated.</p>
          </section>

          <p className="font-medium text-white pt-2">By uploading content, you confirm that you have read and agree to this Creator Content Agreement.</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
          {onDisagree && (
            <button
              type="button"
              onClick={onDisagree}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
            >
              I Disagree
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setCreatorAgreed()
              onAgree()
            }}
            className="px-6 py-2 rounded-lg bg-amber-glow hover:bg-amber-600 text-black font-semibold transition"
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  )
}
