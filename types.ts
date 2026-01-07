
export interface RawQuestion {
  pregunta: string;
  correctas: string[]; 
  incorrectas: string[];
}

export interface QuizConfig {
  title: string;
  instructor: string;
  count: number;
  optionsCount: number; 
  hasTimer: boolean;
  timeLimit: number; 
  sequentialMode: boolean;
}
