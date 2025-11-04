import { Clock, CheckCircle, Gift, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineVisualizationProps {
  commitDeadline: bigint;
  revealTime: bigint;
  claimDeadline: bigint;
  state: number;
  className?: string;
}

interface TimelinePhase {
  label: string;
  icon: React.ReactNode;
  timestamp: bigint;
  isActive: boolean;
  isComplete: boolean;
}

export function TimelineVisualization({
  commitDeadline,
  revealTime,
  claimDeadline,
  state,
  className = "",
}: TimelineVisualizationProps) {
  const now = Math.floor(Date.now() / 1000);

  // Determine which phases are complete and active
  const phases: TimelinePhase[] = [
    {
      label: "Commit Phase",
      icon: <Clock className="h-5 w-5" />,
      timestamp: commitDeadline,
      isActive: state === 1 && now < Number(commitDeadline),
      isComplete: now >= Number(commitDeadline),
    },
    {
      label: "Reveal",
      icon: <Gift className="h-5 w-5" />,
      timestamp: revealTime,
      isActive: state === 1 && now >= Number(commitDeadline) && now < Number(revealTime),
      isComplete: state >= 2,
    },
    {
      label: "Claim Period",
      icon: <Trophy className="h-5 w-5" />,
      timestamp: claimDeadline,
      isActive: state === 2,
      isComplete: state === 3,
    },
    {
      label: "Finalized",
      icon: <CheckCircle className="h-5 w-5" />,
      timestamp: 0n,
      isActive: state === 3,
      isComplete: state === 3,
    },
  ];

  const formatDate = (timestamp: bigint): string => {
    if (timestamp === 0n) return "";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className={cn("w-full", className)}>
      <h3 className="text-lg font-semibold mb-4">Lottery Timeline</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline phases */}
        <div className="space-y-6">
          {phases.map((phase, index) => (
            <div key={index} className="relative flex items-start gap-4">
              {/* Icon circle */}
              <div
                className={cn(
                  "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background",
                  phase.isActive && "border-primary bg-primary text-primary-foreground",
                  phase.isComplete && !phase.isActive && "border-green-500 bg-green-50 text-green-600",
                  !phase.isActive && !phase.isComplete && "border-muted bg-muted text-muted-foreground"
                )}
              >
                {phase.icon}
              </div>

              {/* Phase info */}
              <div className="flex-1 pt-2">
                <div className="flex items-center justify-between">
                  <h4
                    className={cn(
                      "font-semibold",
                      phase.isActive && "text-primary",
                      phase.isComplete && !phase.isActive && "text-green-600",
                      !phase.isActive && !phase.isComplete && "text-muted-foreground"
                    )}
                  >
                    {phase.label}
                  </h4>
                  {phase.timestamp > 0n && (
                    <span className="text-sm text-muted-foreground">
                      {formatDate(phase.timestamp)}
                    </span>
                  )}
                </div>
                {phase.isActive && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Currently in progress
                  </p>
                )}
                {phase.isComplete && !phase.isActive && (
                  <p className="text-sm text-green-600 mt-1">Completed</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
