import { useState, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import codedActionApps from '../uipath';
import { Theme, MessageSeverity } from '@uipath/coded-action-app';
import loanImage from '../assets/loanApplication.png';
import documentIcon from '../assets/documentIcon.png';
import themeToggler from '../assets/themeToggler.png';

interface FormData {
  applicantName: string;
  loanAmount: string | number;
  creditScore: string | number;
  riskFactor: string;
  reviewerComments: string;
}

interface FormProps {
  onInitTheme: (isDark: boolean) => void;
  darkTheme: boolean;
  onToggleTheme: () => void;
}

type TabType = 'review' | 'document';

const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

// Prevent decimal point (.) and 'e' from being entered in the Risk Factor field
const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.currentTarget.name === 'riskFactor' && (e.key === '.' || e.key === 'e' || e.key === 'E')) {
    e.preventDefault();
  }
};

const formatCurrency = (value: string | number) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return value || '';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
};

const Form = ({ onInitTheme, darkTheme, onToggleTheme }: FormProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    applicantName: '',
    loanAmount: '',
    creditScore: '',
    riskFactor: '',
    reviewerComments: ''
  });

  useEffect(() => {
    const init = async () => {
      try {
        const task = await codedActionApps.getTask();
        if (task.data) {
          // Keep only the fields this form owns; ignore any extra properties on the task data.
          const data = task.data as Partial<FormData>;
          setFormData({
            applicantName: data.applicantName ?? '',
            loanAmount: data.loanAmount ?? '',
            creditScore: data.creditScore ?? '',
            riskFactor: data.riskFactor ?? '',
            reviewerComments: data.reviewerComments ?? '',
          });
        }
        setIsReadOnly(task.isReadOnly);
        onInitTheme(isDarkTheme(task.theme));
      } catch (err: unknown) {
        codedActionApps.showMessage(
          err instanceof Error ? err.message : 'Failed to load the task.',
          MessageSeverity.Error,
        );
      }
    };

    init();
  }, [onInitTheme]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    codedActionApps.setTaskData(updatedData);

    if (name === 'riskFactor' && value !== '') {
      const num = Number(value);
      if (num < 0 || num > 10) {
        codedActionApps.showMessage('Risk Factor must be between 0 and 10.', MessageSeverity.Error);
      }
    }
  };

  // Complete the task with only the fields this form owns, so any extra
  // properties present in the incoming task data are not echoed back.
  const completeWith = (outcome: 'Approve' | 'Reject') => {
    const { applicantName, loanAmount, creditScore, riskFactor, reviewerComments } = formData;
    return codedActionApps.completeTask(outcome, {
      applicantName,
      loanAmount,
      creditScore,
      riskFactor,
      reviewerComments,
    });
  };

  const submitDecision = async (outcome: 'Approve' | 'Reject') => {
    try {
      setIsSubmitting(true);
      await completeWith(outcome);
    } catch (err: unknown) {
      codedActionApps.showMessage(
        err instanceof Error ? err.message : 'Failed to complete task.',
        MessageSeverity.Error,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = () => submitDecision('Approve');
  const handleReject = () => submitDecision('Reject');

  const riskFactorNum = Number(formData.riskFactor);
  const isRiskFactorValid = !!formData.riskFactor && riskFactorNum >= 0 && riskFactorNum <= 10;
  const isFormValid = !isReadOnly && !isSubmitting && isRiskFactorValid;

  return (
    <div className="review-app">
      <header className="review-header">
        <div className="review-header__icon" aria-hidden="true">
          <img src={documentIcon} alt="" width={32} height={32} style={{ borderRadius: 8 }} />
        </div>
        <div className="review-header__titles">
          <h1 className="review-header__title">Loan Application Review</h1>
          <p className="review-header__subtitle">
            Review the applicant details and supporting document, then record your decision.
          </p>
        </div>
        <div className="review-header__actions">
          {isReadOnly && <span className="review-badge">Read only</span>}
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <img src={themeToggler} alt="" width={20} height={20} />
          </button>
        </div>
      </header>

      <nav className="review-tabs">
        <button
          type="button"
          className={`review-tab ${activeTab === 'review' ? 'review-tab--active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          Review Form
        </button>
        <button
          type="button"
          className={`review-tab ${activeTab === 'document' ? 'review-tab--active' : ''}`}
          onClick={() => setActiveTab('document')}
        >
          Document
        </button>
      </nav>

      <div className="form-container form-container--enter">
        {activeTab === 'review' && (
          <>
            <section className="form-section">
              <h2 className="form-title">Applicant Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="applicantName">Applicant Name</label>
                  <input id="applicantName" name="applicantName" value={formData.applicantName} placeholder="—" readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="loanAmount">Loan Amount</label>
                  <input id="loanAmount" name="loanAmount" value={formatCurrency(formData.loanAmount)} placeholder="—" readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="creditScore">Credit Score</label>
                  <input id="creditScore" name="creditScore" value={formData.creditScore} placeholder="—" readOnly />
                </div>
              </div>
            </section>

            <section className="form-section">
              <h2 className="form-title">Reviewer Assessment</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="riskFactor">Risk Factor <span className="req" aria-hidden="true">*</span></label>
                  <input
                    type="number"
                    id="riskFactor"
                    name="riskFactor"
                    value={formData.riskFactor}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter a value from 0 to 10"
                    step="1"
                    min={0}
                    max={10}
                    required
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
              <div className="form-group form-group--spaced">
                <label htmlFor="reviewerComments">Reviewer Comments</label>
                <textarea
                  id="reviewerComments"
                  name="reviewerComments"
                  value={formData.reviewerComments}
                  onChange={handleChange}
                  placeholder="Add your review notes…"
                  rows={5}
                  readOnly={isReadOnly}
                />
              </div>
            </section>
          </>
        )}

        {activeTab === 'document' && (
          <div className="application-image-container">
            <img src={loanImage} alt="Loan application document" />
          </div>
        )}
      </div>

      <div className="form-buttons">
        <button type="button" className="outcome-btn outcome-btn--secondary" onClick={handleReject} disabled={!isFormValid}>
          Reject
        </button>
        <button type="button" className="outcome-btn outcome-btn--primary" onClick={handleApprove} disabled={!isFormValid}>
          Approve
        </button>
      </div>
    </div>
  );
};

export default Form;
