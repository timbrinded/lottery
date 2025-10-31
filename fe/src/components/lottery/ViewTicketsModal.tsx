import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Download } from 'lucide-react';
import { useCopyToClipboard } from 'usehooks-ts';
import { QRCodeSVG } from 'qrcode.react';
import { encodeTicketCode } from '@/lib/crypto';
import { useLotterySecrets } from '@/hooks/useLotterySecrets';

interface ViewTicketsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotteryId: bigint;
}

interface TicketData {
  ticketIndex: number;
  ticketSecret: string;
  ticketCode: string;
  redemptionUrl: string;
}

export function ViewTicketsModal({
  open,
  onOpenChange,
  lotteryId,
}: ViewTicketsModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [, copy] = useCopyToClipboard();
  const { getSecretData } = useLotterySecrets();

  const secretData = getSecretData(lotteryId);
  const ticketSecrets = secretData?.ticketSecrets || [];
  const creatorSecret = secretData?.creatorSecret || '';

  const generateRedemptionUrl = (ticketCode: string): string => {
    const params = new URLSearchParams({ code: ticketCode });
    return `${window.location.origin}/ticket?${params.toString()}`;
  };

  // Generate ticket data from stored secrets
  const tickets: TicketData[] = ticketSecrets.map((secret, index) => {
    const ticketCode = encodeTicketCode(lotteryId, index, secret);
    return {
      ticketIndex: index,
      ticketSecret: secret,
      ticketCode,
      redemptionUrl: generateRedemptionUrl(ticketCode),
    };
  });

  const copyToClipboard = async (text: string, index?: number) => {
    await copy(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const downloadAllTickets = () => {
    const data = {
      lotteryId: lotteryId.toString(),
      creatorSecret,
      tickets: tickets.map((t) => ({
        ticketIndex: t.ticketIndex,
        ticketCode: t.ticketCode,
        ticketSecret: t.ticketSecret,
        redemptionUrl: t.redemptionUrl,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lottery-${lotteryId}-tickets.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Lottery Tickets</DialogTitle>
              <DialogDescription>
                Lottery ID: {lotteryId.toString()}
              </DialogDescription>
            </div>
            {tickets.length > 0 && (
              <Button onClick={downloadAllTickets} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {tickets.length === 0 ? (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">⚠️ Ticket Secrets Not Available</p>
                    <p className="text-sm">
                      Ticket secrets were not saved when this lottery was created, or they were
                      cleared from local storage. You need the original ticket codes that were
                      generated during creation.
                    </p>
                    <p className="text-sm">
                      If you downloaded the ticket JSON file during creation, you can use that to
                      retrieve the ticket codes.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> Only lotteries created after this update will have
                  ticket secrets automatically saved. For older lotteries, you'll need the
                  original ticket codes or JSON export.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Ticket Codes ({tickets.length} tickets)</strong> - Share these with
                  participants. Each code can be pasted directly into the redemption page.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                {tickets.map((ticket) => (
                  <Card key={ticket.ticketIndex}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Ticket #{ticket.ticketIndex + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Ticket Code */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Ticket Code
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-primary/5 border-2 border-primary/20 rounded-lg">
                          <code className="flex-1 text-sm font-mono font-semibold break-all">
                            {ticket.ticketCode}
                          </code>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              copyToClipboard(ticket.ticketCode, ticket.ticketIndex)
                            }
                          >
                            {copiedIndex === ticket.ticketIndex ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="flex justify-center p-4 bg-white rounded-md border">
                        <QRCodeSVG value={ticket.ticketCode} size={150} level="M" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
