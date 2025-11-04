import { useState } from "react";
import { QrReader } from "react-qr-reader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, X, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: any, error: any) => {
    if (result) {
      onScan(result?.text || result);
    }
    
    if (error) {
      // Only show errors for actual camera/permission issues, not "no QR code found" errors
      if (error.name === "NotAllowedError") {
        console.error("QR Scanner error:", error);
        setError("Camera access denied. Please enable camera permissions in your browser settings.");
      } else if (error.name === "NotFoundError") {
        console.error("QR Scanner error:", error);
        setError("No camera found on this device.");
      }
      // Ignore NotFoundException (no QR code detected) - this is normal during scanning
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Scan QR Code</CardTitle>
              <CardDescription>
                Point your camera at the ticket QR code
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative aspect-square w-full overflow-hidden rounded-lg border-2 border-primary/20 bg-black">
          <QrReader
            onResult={handleScan}
            constraints={{ facingMode: "environment" }}
            videoId="qr-video"
            scanDelay={300}
            videoStyle={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            containerStyle={{
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-2 border-primary/50 rounded-lg" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg" />
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Tip:</strong> Make sure the QR code is well-lit and centered in the frame.
            The scanner will automatically detect and process the code.
          </AlertDescription>
        </Alert>

        <Button variant="outline" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}
