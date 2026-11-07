export interface MetricItem {
  name: string;
  val: string;
  unit: string;
  trend: string;
  fill: number;
  status: 'positive' | 'neutral' | 'warning';
}

export interface TourStepData {
  id: string;
  stepOrder: string;
  title: string;
  category: string;
  desc: string;
  camera: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  metrics: MetricItem[];
  caseTitle: string;
  caseDetail: string;
  caseEffect: string;
  specs: {
    temp: string;
    pressure: string;
    capacity: string;
    safetyStandard: string;
  };
}

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  role: string;
  registeredAt: string;
  consent152FZAt?: string;
  consentVersion?: string;
  avatarColor?: string;
  settings?: {
    theme?: 'day' | 'night';
    autoTourInterval?: number;
  };
}

export interface ValidationState {
  isValid: boolean;
  emailError: string | null;
  emailSuggestion: string | null;
  passwordError: string | null;
  nameError: string | null;
  generalError: string | null;
}
