import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Check } from "lucide-react";
import { encodeTicketCode } from "@/lib/crypto";

interface TicketDistributionProps {
  lotteryId: bigint;
  creatorSecret: string;
  ticketSecrets: string[];
}

interface TicketData {
  lotteryId: string;
  ticketIndex: number;
  ticketSecret: string;
  ticketCode: string;
  redemptionUrl: string;
}

export function TicketDistribution({
  lotteryId,
  creatorSecret,
  ticketSecrets,
}: TicketDistributionProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedCreatorSecret, setCopiedCreatorSecret] = useState(false);

  const generateRedemptionUrl = (ticketCode: string): string => {
    const params = new URLSearchParams({ code: ticketCode });
    return `${window.location.origin}/ticket?${params.toString()}`;
  };

  const tickets: TicketData[] = ticketSecrets.map((secret, index) => {
    const ticketCode = encodeTicketCode(lotteryId, index, secret);
    return {
      lotteryId: lotteryId.toString(),
      ticketIndex: index,
      ticketSecret: secret,
      ticketCode,
      redemptionUrl: generateRedemptionUrl(ticketCode),
    };
  });

  const copyToClipboard = async (text: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } else {
        setCopiedCreatorSecret(true);
        setTimeout(() => setCopiedCreatorSecret(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
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
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lottery-${lotteryId}-tickets.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Creator Secret Warning */}
      <Alert variant="destructive" className="border-2">
        <AlertDescription>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <span className="font-bold text-lg">SAVE THIS SECRET!</span>
            </div>
            <p className="text-sm">
              You'll need this secret to reveal the lottery. If you lose it, the
              lottery cannot be revealed and all funds will be refunded after 24
              hours.
            </p>
            <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
              <code className="flex-1 text-sm font-mono break-all">
                {creatorSecret}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(creatorSecret)}
              >
                {copiedCreatorSecret ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Lottery Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lottery Created Successfully!</CardTitle>
              <CardDescription>
                Lottery ID:{" "}
                <Badge variant="secondary">{lotteryId.toString()}</Badge>
              </CardDescription>
            </div>
            <Button onClick={downloadAllTickets} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Distribute these ticket codes to participants. Each ticket has a
            unique redemption URL and QR code.
          </p>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Ticket Codes ({tickets.length} tickets)
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {tickets.map((ticket) => (
            <Card key={ticket.ticketIndex}>
              <CardHeader>
                <CardTitle className="text-base">
                  Ticket #{ticket.ticketIndex + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Compact Ticket Code (Primary) */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Ticket Code (Share This!)
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
                  <p className="text-xs text-muted-foreground">
                    Compact code - participants can paste this directly into the
                    redemption page
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center p-4 bg-white rounded-md border">
                  <QRCodeSVG
                    value={ticket.ticketCode}
                    size={150}
                    level="M"
                    includeMargin
                  />
                </div>

                {/* Advanced Options (Collapsible) */}
                <details className="space-y-2">
                  <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                    Advanced Options
                  </summary>

                  <div className="space-y-3 pt-2">
                    {/* Redemption URL */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Full URL (Alternative)
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs p-2 bg-muted rounded-md break-all">
                          {ticket.redemptionUrl}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(ticket.redemptionUrl)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Ticket Secret (for reference) */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Raw Secret (For Reference)
                      </label>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 text-xs p-2 bg-muted rounded-md break-all">
                          {ticket.ticketSecret}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(ticket.ticketSecret)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Save your creator secret in a secure location</li>
            <li>
              Share the compact ticket codes or QR codes with participants
            </li>
            <li>Participants paste the code into the redemption page</li>
            <li>Participants must commit their tickets before the deadline</li>
            <li>
              After the commit deadline, you can reveal the lottery using your
              secret
            </li>
            <li>Winners can then claim their prizes</li>
          </ol>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>About the ticket codes:</strong> The compact codes shown
              above encode all ticket information (lottery ID, ticket number,
              and secret) into a short base58 string. Participants can simply
              paste this code into the redemption page - no need for long URLs!
              The QR codes also contain these compact codes for easy scanning.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
