import { cn } from "@/lib/utils";

interface HeroProps {
  variant?: "light" | "dark";
}

export const Hero = ({ variant = "dark" }: HeroProps) => {
  const gradient =
    variant === "light"
      ? "[background:radial-gradient(125%_125%_at_50%_10%,#ecf8f8_35%,#63e_100%)]"
      : "[background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]";

  return (
    <div className={cn("w-full relative h-screen")}>
      <div className="absolute inset-0">
        <div
          className={cn(
            "absolute inset-0 -z-10 h-full w-full items-center px-5 py-24",
            gradient
          )}
        />
      </div>
    </div>
  );
};
