import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Share2, Lock, PartyPopper, ShieldCheck } from "lucide-react";

interface HowItWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
            How It Works
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="create" className="text-xs sm:text-sm px-2 py-2">Create</TabsTrigger>
            <TabsTrigger value="share" className="text-xs sm:text-sm px-2 py-2">Share</TabsTrigger>
            <TabsTrigger value="commit" className="text-xs sm:text-sm px-2 py-2">Commit</TabsTrigger>
            <TabsTrigger value="reveal" className="text-xs sm:text-sm px-2 py-2">Reveal</TabsTrigger>
            <TabsTrigger value="fair" className="text-xs sm:text-sm px-2 py-2">Fair</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-3 sm:space-y-4 py-4 sm:py-6 animate-in fade-in-50 duration-300">
            <div className="flex justify-center">
              <Gift className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-center px-2">
              🎁 Create Your Mystery Lottery
            </h3>
            <p className="text-sm sm:text-base text-center text-muted-foreground leading-relaxed px-4">
              Set your prizes, choose how many tickets, and pick your deadlines. 
              We'll generate unique ticket codes for you to share.
            </p>
          </TabsContent>

          <TabsContent value="share" className="space-y-3 sm:space-y-4 py-4 sm:py-6 animate-in fade-in-50 duration-300">
            <div className="flex justify-center">
              <Share2 className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-center px-2">
              📤 Share Your Tickets
            </h3>
            <p className="text-sm sm:text-base text-center text-muted-foreground leading-relaxed px-4">
              Send ticket codes via QR codes, links, or however you want. 
              Each ticket is a mystery—no one knows what they'll win!
            </p>
          </TabsContent>

          <TabsContent value="commit" className="space-y-3 sm:space-y-4 py-4 sm:py-6 animate-in fade-in-50 duration-300">
            <div className="flex justify-center">
              <Lock className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-center px-2">
              🔒 Participants Commit
            </h3>
            <p className="text-sm sm:text-base text-center text-muted-foreground leading-relaxed px-4">
              Ticket holders commit before the deadline. This locks them in 
              without revealing who has which ticket.
            </p>
          </TabsContent>

          <TabsContent value="reveal" className="space-y-3 sm:space-y-4 py-4 sm:py-6 animate-in fade-in-50 duration-300">
            <div className="flex justify-center">
              <PartyPopper className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-center px-2">
              🎉 Reveal & Claim Prizes
            </h3>
            <p className="text-sm sm:text-base text-center text-muted-foreground leading-relaxed px-4">
              After the deadline, you reveal the lottery. Winners are randomly 
              assigned and can claim their prizes instantly!
            </p>
          </TabsContent>

          <TabsContent value="fair" className="space-y-3 sm:space-y-4 py-4 sm:py-6 animate-in fade-in-50 duration-300">
            <div className="flex justify-center">
              <ShieldCheck className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-center px-2">
              ✅ Provably Fair
            </h3>
            <p className="text-sm sm:text-base text-center text-muted-foreground leading-relaxed px-4">
              Our commit-reveal system ensures no one can cheat. Everything 
              happens on the blockchain—fully transparent and verifiable.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
