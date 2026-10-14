import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HeroSection } from "@/components/marketing/HeroSection";
import { NetworkFlowVisualizer } from "@/components/marketing/NetworkFlowVisualizer";
import { ProblemSolutionStorytelling } from "@/components/marketing/ProblemSolutionStorytelling";
import { FeatureDeepDives } from "@/components/marketing/FeatureDeepDives";
import { BaselineComparisonVisualizer } from "@/components/marketing/BaselineComparisonVisualizer";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { ClosingCtaSection } from "@/components/marketing/ClosingCtaSection";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function MarketingPage() {
  return (
    <div style={{ backgroundColor: "#07090b", minHeight: "100vh", color: "#ffffff" }}>
      <MarketingNav />
      <main>
        <HeroSection />
        <NetworkFlowVisualizer />
        <ProblemSolutionStorytelling />
        <FeatureDeepDives />
        <BaselineComparisonVisualizer />
        <HowItWorksSection />
        <ClosingCtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
