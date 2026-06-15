import { BaseAgent, AgentContext, AgentResult } from '../../../modules/agent/agent.abstract';
import { ClusterType, MissionCategory } from '../../../modules/agent/entities/agent.entity';
import { AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

export class HRAgent extends BaseAgent {
  readonly name = 'HRAgent';
  readonly cluster = ClusterType.BUSINESS;
  readonly capabilities = ['recruit', 'onboard', 'review', 'payroll', 'schedule', 'training'];
  readonly version = '2.0.0';
  readonly description = 'Human resources management including recruitment, onboarding, performance reviews, payroll, scheduling, and training coordination';

  readonly missionCategories = [MissionCategory.BUSINESS_INTELLIGENCE];
  readonly creditCost = 1;
  readonly powerLevel = 1;
  readonly tier = 'standard';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'recruit';
      const startTime = Date.now();
      this.emitEvent(AgentEventType.AGENT_STARTED, { action });

      switch (action) {
        case 'recruit': {
          const operation = config.operation || 'list';
          const jobId = config.jobId;
          const title = config.title;
          const department = config.department;
          const location = config.location;
          const employmentType = config.employmentType || 'full_time';
          const salaryRange = config.salaryRange || {};
          const requirements = config.requirements || [];
          const responsibilities = config.responsibilities || [];
          const skills = config.skills || [];
          const experience = config.experience;
          const postedDate = config.postedDate;
          const closingDate = config.closingDate;
          const recruiter = config.recruitor;
          const limit = config.limit || 50;
          const offset = config.offset || 0;

          if (operation === 'create' && !title) { return { success: false, error: '"title" is required to create a job posting' }; }

          this.logger.log(`Recruit operation: ${operation}${jobId ? ` (ID: ${jobId})` : ''}`);

          const llmResult = await this.executeWithLLM(
            `You are an HR recruitment expert. You manage job postings, applicant tracking, and recruitment analytics with realistic metrics.`,
            `Process ${operation} recruitment. ${title ? `Job: "${title}"` : ''}. Return JSON with: jobs (array of {id, title, department, location, employmentType, salaryRange, requirements, skills, status, applicantsCount, postedDate, closingDate, recruiter}), applicants (array of {id, name, email, jobId, jobTitle, stage, appliedDate, rating, source}), summary {totalOpenPositions, totalApplicants, avgTimeToHire, offerAcceptanceRate}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed = this.safeJsonParse(llmResult);
          if (parsed) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, jobId, title, department, location, employmentType, salaryRange: salaryRange as any, requirements, responsibilities, skills, experience, postedDate, closingDate, recruiter, limit, offset, jobs: parsed.jobs || [], applicants: parsed.applicants || [], summary: parsed.summary || { totalOpenPositions: 0, totalApplicants: 0, avgTimeToHire: 0, offerAcceptanceRate: 0 }, status: 'recruit_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, jobId, title, department, location, employmentType, salaryRange: salaryRange as any, requirements, responsibilities, skills, experience, postedDate, closingDate, recruiter, limit, offset, jobs: [
            { id: 'job_1', title: 'Senior Software Engineer', department: 'Engineering', location: 'Remote', employmentType: 'full_time', salaryRange: { min: 140000, max: 180000, currency: 'USD' }, requirements: ['5+ years experience', 'BS in Computer Science'], skills: ['TypeScript', 'React', 'Node.js'], status: 'open', applicantsCount: 42, postedDate: '2025-02-01', closingDate: '2025-03-15', recruiter: 'hr_rep_1' },
            { id: 'job_2', title: 'Product Marketing Manager', department: 'Marketing', location: 'New York, NY', employmentType: 'full_time', salaryRange: { min: 110000, max: 145000, currency: 'USD' }, requirements: ['3+ years B2B marketing', 'MBA preferred'], skills: ['Content strategy', 'Analytics', 'CRM'], status: 'open', applicantsCount: 28, postedDate: '2025-02-10', closingDate: '2025-03-20', recruiter: 'hr_rep_2' },
          ], applicants: [
            { id: 'app_1', name: 'Alex Johnson', email: 'alex.j@email.com', jobId: 'job_1', jobTitle: 'Senior Software Engineer', stage: 'interview', appliedDate: '2025-02-05', rating: 4.5, source: 'linkedin' },
            { id: 'app_2', name: 'Patricia Lee', email: 'pat.lee@email.com', jobId: 'job_1', jobTitle: 'Senior Software Engineer', stage: 'assessment', appliedDate: '2025-02-08', rating: 4.0, source: 'referral' },
            { id: 'app_3', name: 'David Kim', email: 'd.kim@email.com', jobId: 'job_2', jobTitle: 'Product Marketing Manager', stage: 'screening', appliedDate: '2025-02-12', rating: 3.5, source: 'job_board' },
          ], summary: { totalOpenPositions: 5, totalApplicants: 156, avgTimeToHire: 34, offerAcceptanceRate: 82 }, status: 'recruit_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'onboard': {
          const operation = config.operation || 'list';
          const onboardingId = config.onboardingId;
          const employeeId = config.employeeId;
          const employeeName = config.employeeName;
          const startDate = config.startDate;
          const department = config.department;
          const manager = config.manager;
          const templateId = config.templateId;
          const tasks = config.tasks || [];
          const buddy = config.buddy;
          const includeProgress = config.includeProgress !== false;

          if (operation === 'create' && !employeeId && !employeeName) { return { success: false, error: '"employeeId" or "employeeName" is required to create an onboarding plan' }; }

          this.logger.log(`Onboard operation: ${operation}${onboardingId ? ` (ID: ${onboardingId})` : ''}`);

          const llmResult_onb = await this.executeWithLLM(
            `You are an HR onboarding expert. You create and manage onboarding plans with phased task lists, checklists, progress tracking, and buddy assignments.`,
            `Process ${operation} onboarding. Employee: ${employeeName || employeeId || 'new'}. Department: ${department || 'General'}. Return JSON with: onboarding {plan {id, employeeId, employeeName, startDate, department, manager, buddy, status}, phases (array of {name, dayRange, tasks (array of {id, title, category, status, dueDate, completedDate, assignee, notes}), progress}), progress {totalTasks, completedTasks, percentComplete, daysRemaining, onTrack}, checklist (array of {item, category, required, completed})}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_onb = this.safeJsonParse(llmResult_onb);
          if (parsed_onb) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, onboardingId, employeeId, employeeName, startDate, department, manager, templateId, tasks: tasks as any[], buddy, includeProgress, onboarding: parsed_onb.onboarding || { plan: {}, phases: [], progress: undefined, checklist: [] }, status: 'onboard_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, onboardingId, employeeId, employeeName, startDate, department, manager, templateId, tasks: tasks as any[], buddy, includeProgress, onboarding: { plan: { id: `onb_${Date.now()}`, employeeId: employeeId || 'emp_new', employeeName: employeeName || 'New Employee', startDate: startDate || new Date().toISOString().split('T')[0], department: department || 'General', manager: manager || 'TBD', buddy: buddy || 'Assigned Buddy', status: 'in_progress' }, phases: [
            { name: 'Pre-boarding', dayRange: 'Day -7 to 0', tasks: [{ id: 't1', title: 'Send welcome email', category: 'admin', status: 'completed', dueDate: new Date().toISOString(), completedDate: new Date().toISOString(), assignee: 'HR', notes: '' }, { id: 't2', title: 'Setup equipment', category: 'it_setup', status: 'completed', dueDate: new Date().toISOString(), completedDate: new Date().toISOString(), assignee: 'IT', notes: '' }], progress: 100 },
            { name: 'First Week', dayRange: 'Day 1-5', tasks: [{ id: 't3', title: 'Orientation session', category: 'admin', status: 'in_progress', dueDate: new Date().toISOString(), completedDate: '', assignee: 'HR', notes: '' }, { id: 't4', title: 'Team introductions', category: 'team', status: 'pending', dueDate: new Date().toISOString(), completedDate: '', assignee: 'Manager', notes: '' }, { id: 't5', title: 'Setup development environment', category: 'it_setup', status: 'pending', dueDate: new Date().toISOString(), completedDate: '', assignee: 'IT', notes: '' }], progress: 33 },
            { name: 'Month 1', dayRange: 'Day 6-30', tasks: [{ id: 't6', title: 'Complete initial training modules', category: 'training', status: 'pending', dueDate: new Date(Date.now() + 14 * 86400000).toISOString(), completedDate: '', assignee: 'L&D', notes: '' }], progress: 0 },
          ], progress: includeProgress ? { totalTasks: 12, completedTasks: 4, percentComplete: 33, daysRemaining: 18, onTrack: true } : undefined, checklist: [
            { item: 'Laptop configured', category: 'it_setup', required: true, completed: true },
            { item: 'Email account active', category: 'it_setup', required: true, completed: true },
            { item: 'HR paperwork signed', category: 'admin', required: true, completed: true },
            { item: 'Security training complete', category: 'training', required: true, completed: false },
            { item: 'Team lunch scheduled', category: 'culture', required: false, completed: false },
          ] }, status: 'onboard_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'review': {
          const operation = config.operation || 'list';
          const reviewId = config.reviewId;
          const employeeId = config.employeeId;
          const reviewerId = config.reviewerId;
          const reviewCycle = config.reviewCycle;
          const period = config.period || 'annual';
          const ratingScale = config.ratingScale || 5;
          const criteria = config.criteria || ['performance', 'communication', 'leadership', 'teamwork', 'innovation'];
          const goals = config.goals || [];
          const selfAssessment = config.selfAssessment;
          const status_ = config.status;

          if (operation === 'create' && !employeeId && !reviewerId) { return { success: false, error: '"employeeId" and "reviewerId" are required to create a performance review' }; }

          this.logger.log(`Review operation: ${operation}${reviewId ? ` (ID: ${reviewId})` : ''}`);

          const llmResult_rev = await this.executeWithLLM(
            `You are an HR performance review expert. You manage performance evaluations with criteria ratings, strengths, improvement areas, goals, and summary statistics.`,
            `Process ${operation} review. Period: ${period}. Rating scale: ${ratingScale}. Criteria: ${criteria.join(', ')}. Return JSON with: reviews (array of {id, employeeId, employeeName, reviewerId, reviewerName, reviewCycle, period, status, overallRating, criteriaRatings (array of {criterion, rating, comment}), strengths, improvements, goals (array of {title, achievement, notes}), submittedAt, completedAt}), summary {totalReviews, completedReviews, averageRating, ratingDistribution, completionRate}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_rev = this.safeJsonParse(llmResult_rev);
          if (parsed_rev) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, reviewId, employeeId, reviewerId, reviewCycle, period, ratingScale, criteria, goals: goals as any[], selfAssessment, queryStatus: status_, reviews: parsed_rev.reviews || [], summary: parsed_rev.summary || { totalReviews: 0, completedReviews: 0, averageRating: 0, ratingDistribution: {}, completionRate: 0 }, status: 'review_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, reviewId, employeeId, reviewerId, reviewCycle, period, ratingScale, criteria, goals: goals as any[], selfAssessment, queryStatus: status_, reviews: [
            { id: 'rev_1', employeeId: 'emp_1', employeeName: 'Alex Johnson', reviewerId: 'mgr_1', reviewerName: 'Sarah Chen', reviewCycle: '2025-H1', period: 'annual', status: 'completed', overallRating: 4.2, criteriaRatings: [{ criterion: 'performance', rating: 4.5, comment: 'Exceeded targets on 3 major projects' }, { criterion: 'communication', rating: 4.0, comment: 'Clear and proactive communicator' }, { criterion: 'leadership', rating: 3.5, comment: 'Growing into leadership role' }, { criterion: 'teamwork', rating: 4.5, comment: 'Excellent collaborator' }, { criterion: 'innovation', rating: 4.5, comment: 'Introduced 2 new process improvements' }], strengths: ['Technical expertise', 'Problem-solving', 'Collaboration'], improvements: ['Delegation skills', 'Presentation abilities'], goals: [{ title: 'Lead a cross-team project', achievement: 75, notes: 'In progress' }], submittedAt: '2025-02-15T10:00:00Z', completedAt: '2025-02-20T14:00:00Z' },
          ], summary: { totalReviews: 45, completedReviews: 38, averageRating: 3.9, ratingDistribution: { '5': 8, '4': 22, '3': 12, '2': 3, '1': 0 }, completionRate: 84 }, status: 'review_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'payroll': {
          const operation = config.operation || 'calculate';
          const payrollId = config.payrollId;
          const period = config.period;
          const payDate = config.payDate;
          const employeeIds = config.employeeIds || [];
          const department = config.department;
          const includeDeductions = config.includeDeductions !== false;
          const includeBenefits = config.includeBenefits !== false;
          const includeOvertime = config.includeOvertime || false;
          const currency = config.currency || 'USD';

          if (operation === 'calculate' && !period) { return { success: false, error: '"period" is required for payroll calculation' }; }

          this.logger.log(`Payroll operation: ${operation}${payrollId ? ` (ID: ${payrollId})` : ''} (period: ${period})`);

          const llmResult_pay = await this.executeWithLLM(
            `You are a payroll processing expert. You calculate employee pay with deductions, benefits, tax withholdings, and generate payroll summaries with realistic financial data.`,
            `Process ${operation} payroll for period ${period || 'current'}. Include deductions: ${includeDeductions}. Include benefits: ${includeBenefits}. Include overtime: ${includeOvertime}. Currency: ${currency}. Return JSON with: payroll {period, payDate, status, employees (array of {employeeId, name, department, baseSalary, overtime, bonus, commissions, grossPay, deductions {federalTax, stateTax, socialSecurity, medicare, healthInsurance, retirement401k, other, totalDeductions}, benefits (array of {benefit, employerContribution, employeeContribution}), netPay, paymentMethod}), summary {totalGrossPay, totalDeductions, totalNetPay, totalEmployerCost, employeeCount, averageGrossPay, averageNetPay}, taxSummary {federalTax, stateTax, socialSecurity, medicare, totalTaxWithholding, employerTaxLiability}}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_pay = this.safeJsonParse(llmResult_pay);
          if (parsed_pay) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, payrollId, period, payDate, employeeIds, department, includeDeductions, includeBenefits, includeOvertime, currency, payroll: parsed_pay.payroll || { period: '', payDate: '', status: '', employees: [], summary: { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0, totalEmployerCost: 0, employeeCount: 0, averageGrossPay: 0, averageNetPay: 0 }, taxSummary: { federalTax: 0, stateTax: 0, socialSecurity: 0, medicare: 0, totalTaxWithholding: 0, employerTaxLiability: 0 } }, status: 'payroll_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, payrollId, period, payDate, employeeIds, department, includeDeductions, includeBenefits, includeOvertime, currency, payroll: { period: period || '2025-03', payDate: payDate || '2025-03-31', status: 'processing', employees: [
            { employeeId: 'emp_1', name: 'Alex Johnson', department: 'Engineering', baseSalary: 15000, overtime: 0, bonus: 2000, commissions: 0, grossPay: 17000, deductions: { federalTax: 3400, stateTax: 850, socialSecurity: 1054, medicare: 247, healthInsurance: 450, retirement401k: 850, other: [], totalDeductions: 6851 }, benefits: [{ benefit: 'Health Insurance', employerContribution: 800, employeeContribution: 450 }, { benefit: '401k Match', employerContribution: 425, employeeContribution: 850 }], netPay: 10149, paymentMethod: 'direct_deposit' },
            { employeeId: 'emp_2', name: 'Patricia Lee', department: 'Marketing', baseSalary: 12500, overtime: 0, bonus: 1500, commissions: 3200, grossPay: 17200, deductions: { federalTax: 3440, stateTax: 860, socialSecurity: 1066, medicare: 249, healthInsurance: 450, retirement401k: 860, other: [], totalDeductions: 6925 }, benefits: [{ benefit: 'Health Insurance', employerContribution: 800, employeeContribution: 450 }, { benefit: '401k Match', employerContribution: 430, employeeContribution: 860 }], netPay: 10275, paymentMethod: 'direct_deposit' },
          ], summary: { totalGrossPay: 34200, totalDeductions: 13776, totalNetPay: 20424, totalEmployerCost: 42455, employeeCount: 2, averageGrossPay: 17100, averageNetPay: 10212 }, taxSummary: { federalTax: 6840, stateTax: 1710, socialSecurity: 2120, medicare: 496, totalTaxWithholding: 11166, employerTaxLiability: 2614 } }, status: 'payroll_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'schedule': {
          const operation = config.operation || 'view';
          const scheduleId = config.scheduleId;
          const employeeId = config.employeeId;
          const department = config.department;
          const dateRange = config.dateRange || {};
          const shiftType = config.shiftType;
          const includeConflicts = config.includeConflicts !== false;
          const includeTimeOff = config.includeTimeOff !== false;
          const limit = config.limit || 50;

          this.logger.log(`Schedule operation: ${operation}${scheduleId ? ` (ID: ${scheduleId})` : ''}`);

          const llmResult_sch = await this.executeWithLLM(
            `You are an HR scheduling expert. You manage employee shift schedules with coverage analysis, conflict detection, and time-off tracking.`,
            `Process ${operation} schedule. Department: ${department || 'all'}. Include conflicts: ${includeConflicts}. Include time off: ${includeTimeOff}. Return JSON with: schedule {shifts (array of {id, employeeId, employeeName, department, date, startTime, endTime, shiftType, location, role, status, notes}), coverage {totalSlots, filledSlots, coveragePercent, understaffed (array)}, conflicts (array), timeOff (array of {employeeId, employeeName, type, startDate, endDate, status}), summary {totalHoursScheduled, averageHoursPerEmployee, overtimeHours, openShifts}}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_sch = this.safeJsonParse(llmResult_sch);
          if (parsed_sch) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, scheduleId, employeeId, department, dateRange: dateRange as any, shiftType, includeConflicts, includeTimeOff, limit, schedule: parsed_sch.schedule || { shifts: [], coverage: { totalSlots: 0, filledSlots: 0, coveragePercent: 0, understaffed: [] }, conflicts: undefined, timeOff: undefined, summary: { totalHoursScheduled: 0, averageHoursPerEmployee: 0, overtimeHours: 0, openShifts: 0 } }, status: 'schedule_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, scheduleId, employeeId, department, dateRange: dateRange as any, shiftType, includeConflicts, includeTimeOff, limit, schedule: { shifts: [
            { id: 'shift_1', employeeId: 'emp_1', employeeName: 'Alex Johnson', department: 'Engineering', date: '2025-03-03', startTime: '09:00', endTime: '17:00', shiftType: 'morning', location: 'Office', role: 'Senior Developer', status: 'scheduled', notes: '' },
            { id: 'shift_2', employeeId: 'emp_2', employeeName: 'Patricia Lee', department: 'Marketing', date: '2025-03-03', startTime: '09:00', endTime: '17:00', shiftType: 'morning', location: 'Office', role: 'Marketing Manager', status: 'confirmed', notes: '' },
          ], coverage: { totalSlots: 40, filledSlots: 38, coveragePercent: 95, understaffed: [{ department: 'Support', date: '2025-03-05', shift: 'night', required: 3, assigned: 2 }] }, conflicts: includeConflicts ? [] : undefined, timeOff: includeTimeOff ? [{ employeeId: 'emp_3', employeeName: 'David Kim', type: 'vacation', startDate: '2025-03-10', endDate: '2025-03-14', status: 'approved' }] : undefined, summary: { totalHoursScheduled: 320, averageHoursPerEmployee: 40, overtimeHours: 12, openShifts: 2 } }, status: 'schedule_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        case 'training': {
          const operation = config.operation || 'list';
          const trainingId = config.trainingId;
          const courseId = config.courseId;
          const title = config.title;
          const type = config.type || 'all';
          const department = config.department;
          const employeeId = config.employeeId;
          const status_ = config.status;
          const dueBefore = config.dueBefore;
          const limit = config.limit || 50;
          const offset = config.offset || 0;

          this.logger.log(`Training operation: ${operation}${trainingId ? ` (ID: ${trainingId})` : ''}`);

          const llmResult_trn = await this.executeWithLLM(
            `You are an HR training and development expert. You manage training programs, course enrollments, compliance tracking, and certification management with realistic data.`,
            `Process ${operation} training. Type: ${type}. Department: ${department || 'all'}. Status: ${status_ || 'all'}. Return JSON with: trainings (array of {id, courseId, title, type, format, department, duration, description, instructor, startDate, endDate, status, enrolledCount, completedCount, averageScore, passingScore}), enrollments (array of {trainingId, title, employeeId, employeeName, enrolledDate, dueDate, status, progress, score, certificateId}), summary {totalCourses, mandatoryDue, completionRate, averageScore, certificationsExpiring, overdueTrainings}, compliance {mandatoryCompletionRate, upcomingDeadlines (array), expiringCertifications (array)}.`,
            { responseFormat: 'json', temperature: 0.3, maxTokens: 2048 },
          );

          const parsed_trn = this.safeJsonParse(llmResult_trn);
          if (parsed_trn) {
            this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: true });
            return { success: true, data: { action, operation, trainingId, courseId, title, type, department, employeeId, queryStatus: status_, dueBefore, limit, offset, trainings: parsed_trn.trainings || [], enrollments: parsed_trn.enrollments || [], summary: parsed_trn.summary || { totalCourses: 0, mandatoryDue: 0, completionRate: 0, averageScore: 0, certificationsExpiring: 0, overdueTrainings: 0 }, compliance: parsed_trn.compliance || { mandatoryCompletionRate: 0, upcomingDeadlines: [], expiringCertifications: [] }, status: 'training_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: true } };
          }

          this.emitEvent(AgentEventType.AGENT_COMPLETED, { action, llmUsed: false, fallback: true });
          return { success: true, data: { action, operation, trainingId, courseId, title, type, department, employeeId, queryStatus: status_, dueBefore, limit, offset, trainings: [
            { id: 'trn_1', courseId: 'crs_1', title: 'Security Awareness Training', type: 'mandatory', format: 'online', department: 'All', duration: '2 hours', description: 'Annual cybersecurity awareness training', instructor: 'Security Team', startDate: '2025-01-15', endDate: '2025-03-31', status: 'in_progress', enrolledCount: 120, completedCount: 95, averageScore: 88, passingScore: 80 },
            { id: 'trn_2', courseId: 'crs_2', title: 'Leadership Development Program', type: 'professional_development', format: 'hybrid', department: 'Management', duration: '8 weeks', description: 'Developing leadership capabilities', instructor: 'External Coach', startDate: '2025-02-01', endDate: '2025-03-28', status: 'in_progress', enrolledCount: 15, completedCount: 0, averageScore: 0, passingScore: 70 },
          ], enrollments: [
            { trainingId: 'trn_1', title: 'Security Awareness Training', employeeId: 'emp_1', employeeName: 'Alex Johnson', enrolledDate: '2025-01-15', dueDate: '2025-03-31', status: 'completed', progress: 100, score: 92, certificateId: 'cert_101' },
            { trainingId: 'trn_1', title: 'Security Awareness Training', employeeId: 'emp_2', employeeName: 'Patricia Lee', enrolledDate: '2025-01-15', dueDate: '2025-03-31', status: 'in_progress', progress: 65, score: 0, certificateId: '' },
          ], summary: { totalCourses: 12, mandatoryDue: 3, completionRate: 79, averageScore: 85, certificationsExpiring: 5, overdueTrainings: 8 }, compliance: { mandatoryCompletionRate: 82, upcomingDeadlines: [{ training: 'Security Awareness Training', dueDate: '2025-03-31', employeesPending: 25 }], expiringCertifications: [{ employeeId: 'emp_5', employeeName: 'Jordan Smith', certification: 'First Aid', expiryDate: '2025-04-15' }] }, status: 'training_operation_complete', timestamp: new Date().toISOString() }, metadata: { duration: Date.now() - startTime, llmUsed: false, fallback: true } };
        }

        default:
          return { success: false, error: `Unknown action: ${action}. Supported actions: recruit, onboard, review, payroll, schedule, training` };
      }
    } catch (error: any) {
      this.emitEvent(AgentEventType.AGENT_FAILED, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}
