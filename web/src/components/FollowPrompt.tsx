interface Props {
  open: boolean;
  onClose: () => void;
}

const FOLLOW_URL = "https://x.com/intent/follow?screen_name=tiger_web3";

export function FollowPrompt({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold">Follow to start searching</h3>
        <p className="mt-2 text-sm text-zinc-400">
          One follow keeps this site free and updated. Search opens after.
        </p>
        <div className="mt-5 flex justify-end">
          <a
            href={FOLLOW_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <span aria-hidden>𝕏</span>
            <span>Follow @tiger_web3</span>
          </a>
        </div>
      </div>
    </div>
  );
}
