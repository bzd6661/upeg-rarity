import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const FOLLOW_URL = "https://x.com/intent/follow?screen_name=tiger_web3";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FollowPrompt({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Follow to start searching</DialogTitle>
          <DialogDescription>
            One follow keeps this site free and updated. Search opens after.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            asChild
            className="bg-emerald-700 hover:bg-emerald-600 text-white"
          >
            <a
              href={FOLLOW_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              <span aria-hidden className="mr-1.5">
                𝕏
              </span>
              Follow @tiger_web3
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
