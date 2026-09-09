import { useState } from "react";
import { PageHeader } from "@/components/common";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FormAnalysis from "@/pages/FormAnalysis";
import FilmRoom from "@/pages/FilmRoom";
import { ScanLine, ImageIcon, Video } from "lucide-react";

export default function Analyze() {
  const [tab, setTab] = useState("photo");
  return (
    <div>
      <PageHeader title="Analyze" icon={ScanLine}
        subtitle="Two ways to break down your mechanics: a still Photo scores one frozen moment, a Video scores your whole motion and saves the clip to your film room." />

      <Tabs value={tab} onValueChange={setTab} className="fade-up">
        <TabsList className="bg-[#121318] border border-[#282C37] p-1 mb-6">
          <TabsTrigger value="photo" data-testid="analyze-tab-photo"
            className="data-[state=active]:bg-[#C6FF00] data-[state=active]:text-[#0A0A0A] text-gray-400 uppercase tracking-wide text-xs font-semibold px-4 gap-2">
            <ImageIcon className="h-4 w-4" /> Photo · Form
          </TabsTrigger>
          <TabsTrigger value="video" data-testid="analyze-tab-video"
            className="data-[state=active]:bg-[#C6FF00] data-[state=active]:text-[#0A0A0A] text-gray-400 uppercase tracking-wide text-xs font-semibold px-4 gap-2">
            <Video className="h-4 w-4" /> Video · Film
          </TabsTrigger>
        </TabsList>
        <TabsContent value="photo"><FormAnalysis embedded /></TabsContent>
        <TabsContent value="video"><FilmRoom embedded /></TabsContent>
      </Tabs>
    </div>
  );
}
