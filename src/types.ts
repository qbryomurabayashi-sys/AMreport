export interface Meeting {
  id: string;
  date: string;
  name1: string;
  name2: string;
  name3: string;
  name4: string;
  name5: string;
  details: string;
  decisions: string;
}

export interface Interview {
  id: string;
  date: string;
  name: string;
  empNo: string;
  interviewer: string;
  importance: string;
  item: string;
  status: string;
  details: string;
}

export interface Guidance {
  id: string;
  date: string;
  name: string;
  empNo: string;
  instructor: string;
  details: string;
}

export interface Complaint {
  id: string;
  inquiryDate: string;
  usageDate: string;
  name: string;
  responder: string;
  customer: string;
  category: string;
  content: string;
  factCheck: string;
  customerResponse: string;
  guidanceDate: string;
  guidanceDetails: string;
  impression: string;
  serviceEval: string;
  techEval: string;
  additions: string;
}

export interface HRChange {
  id: string;
  date: string;
  name: string;
  empNo: string;
  interviewer: string;
  details: string;
}

export interface Leave {
  id: string;
  date: string;
  name: string;
  empNo: string;
  interviewer: string;
  details: string;
}

export interface StoreData {
  id: string;
  name: string;
  seats: string;
  manager: string;
  am: string;
  quarter: string;

  // KPT Fields
  kptKeep: string;
  kptProblemIdeal: string;
  kptProblemGap: string;
  kptTryWhoWhen: string;
  kptTryWhat: string;
  kptTryWhy: string;

  actionPlan: string;
  lastMonthReflection: string;
  thisMonthInitiatives: string;
  promotion: string;
  learningAndResults: string;
  priorityItems: string;
  equipment: string;
  staffGrowth: string;
  staffConcerns: string;
  otherTopics: string;
  meetings: Meeting[];
  interviews: Interview[];
  guidances: Guidance[];
  complaints: Complaint[];
  hrChanges: HRChange[];
  leaves: Leave[];
}
