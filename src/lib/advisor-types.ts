import type { Candidate, Economics, SiteData } from "./solar-model";
import type { RoofLayout } from "./solar.server";

export type { RoofLayout };

export type BuildingBox = {
  sw: { latitude: number; longitude: number };
  ne: { latitude: number; longitude: number };
};

export type AnalysisResult = {
  sessionId: string | null;
  lat: number;
  lng: number;
  address: string | null;
  score: number;
  explanation: string;
  recommendedLabel: Candidate["label"];
  recommendedReason: string;
  configs: Candidate[];
  candidateCount: number;
  site: SiteData;
  economics: Economics;
  buildingBox: BuildingBox | null;
  roofLayout: RoofLayout | null;
  warnings: string[];
};
