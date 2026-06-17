import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import { Theme, MessageSeverity } from '@uipath/coded-action-app';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Document, Page, pdfjs } from 'react-pdf';
import uipath from '../uipath';
import documentIcon from '../assets/documentIcon.png';
import themeToggler from '../assets/themeToggler.png';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LoanDocument {
  ID: string;
  FullName: string;
}

interface FormData {
  applicantName: string;
  loanAmount: string | number;
  creditScore: string | number;
  riskFactor: string;
  reviewerComments: string;
  loanDocument: LoanDocument | null;
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
    reviewerComments: '',
    loanDocument: null,
  });
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [hasLoadedDocument, setHasLoadedDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const task = await uipath.codedActionAppsService.getTask();
        if (task.data) {
          // Keep only the fields this form owns; ignore any extra properties on the task data.
          const data = task.data as Partial<FormData>;
          setFormData({
            applicantName: data.applicantName ?? '',
            loanAmount: data.loanAmount ?? '',
            creditScore: data.creditScore ?? '',
            riskFactor: data.riskFactor ?? '',
            reviewerComments: data.reviewerComments ?? '',
            loanDocument: data.loanDocument
              ? { ID: data.loanDocument.ID, FullName: data.loanDocument.FullName }
              : null,
          });
        }
        setIsReadOnly(task.isReadOnly);
        onInitTheme(isDarkTheme(task.theme));
      } catch (err: unknown) {
        uipath.codedActionAppsService.showMessage(
          err instanceof Error ? err.message : 'Failed to load the task.',
          MessageSeverity.Error,
        );
      }
    };

    init();
  }, [onInitTheme]);

  // Load document data only when switching to document tab
  useEffect(() => {
    if (activeTab === 'document' && !hasLoadedDocument && !isLoadingDocument && formData) {
      if (!formData.loanDocument?.ID) return;
      let cancelled = false;

      const loadDocument = async () => {
        try {
          setIsLoadingDocument(true);
          setDocumentError(null);

          const attachment = await uipath.attachmentService.getById(formData.loanDocument!.ID);
          const uriResponse = attachment.blobFileAccess;

          let url: string;
          if (uriResponse.requiresAuth) {
            const response = await fetch(uriResponse.uri, { headers: uriResponse.headers });
            if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}).`);
            const blob = await response.blob();
            url = URL.createObjectURL(blob);
            blobUrlRef.current = url;
          } else {
            url = uriResponse.uri;
          }

          if (!cancelled) setDocumentUrl(url);
          if (!cancelled) setHasLoadedDocument(true);
        } catch (err: unknown) {
          if (!cancelled) setDocumentError(err instanceof Error ? err.message : 'Failed to load document.');
          if (!cancelled) setHasLoadedDocument(true);
        } finally {
          if (!cancelled) setIsLoadingDocument(false);
        }
      };

      loadDocument();

      return () => {
        cancelled = true;
      };
    }
  // `isLoadingDocument` is read only as a re-entrancy guard, so it is intentionally left out of
  // the deps. Adding it would re-run the effect the moment loading starts; the previous run's
  // cleanup then sets `cancelled = true`, cancelling the in-flight fetch so the document URL is
  // never set.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasLoadedDocument, formData]);

  // Revoke the blob URL only when the component unmounts, so the PDF viewer keeps a valid
  // URL for the lifetime of the form.
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);


  const zoomIn  = () => setScale((s) => Math.min(2.5, parseFloat((s + 0.2).toFixed(1))));
  const zoomOut = () => setScale((s) => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))));
  const resetZoom = () => setScale(1.0);

  const handleDownload = async () => {
    if (!documentUrl) return;
    const fileName = formData.loanDocument?.FullName || 'document.pdf';
    try {
      let blobUrl: string;
      let tempBlob = false;
      if (documentUrl.startsWith('blob:')) {
        blobUrl = documentUrl;
      } else {
        const response = await fetch(documentUrl);
        if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}).`);
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        tempBlob = true;
      }
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (tempBlob) URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      uipath.codedActionAppsService.showMessage(
        err instanceof Error ? err.message : 'Download failed.',
        MessageSeverity.Error,
      );
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    uipath.codedActionAppsService.setTaskData(updatedData);

    if (name === 'riskFactor' && value !== '') {
      const num = Number(value);
      if (num < 0 || num > 10) {
        uipath.codedActionAppsService.showMessage('Risk Factor must be between 0 and 10.', MessageSeverity.Error);
      }
    }
  };

  // Complete the task with only the fields this form owns, so any extra
  // properties present in the incoming task data are not echoed back.
  const completeWith = (outcome: 'Approve' | 'Reject') => {
    const {
      applicantName,
      loanAmount,
      creditScore,
      riskFactor,
      reviewerComments,
      loanDocument,
    } = formData;
    return uipath.codedActionAppsService.completeTask(outcome, {
      applicantName,
      loanAmount,
      creditScore,
      riskFactor,
      reviewerComments,
      loanDocument,
    });
  };

  const submitDecision = async (outcome: 'Approve' | 'Reject') => {
    try {
      setIsSubmitting(true);
      await completeWith(outcome);
    } catch (err: unknown) {
      uipath.codedActionAppsService.showMessage(
        err instanceof Error ? err.message : 'Failed to complete task.',
        MessageSeverity.Error,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = () => submitDecision('Approve');
  const handleReject = () => submitDecision('Reject');

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));

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
          <div className="pdf-shell">
            {isLoadingDocument ? (
              <div className="pdf-loading"><div className="pdf-spinner" />Loading PDF…</div>
            ) : documentError ? (
              <div className="pdf-shell--center">
                <div className="pdf-error">
                  <span className="pdf-error__icon">⚠</span>
                  <p>{documentError}</p>
                </div>
              </div>
            ) : documentUrl ? (
              <>
                <div className="pdf-toolbar">
                  <div className="pdf-toolbar__group">
                    <button type="button" className="pdf-btn" onClick={goToPrevPage} disabled={pageNumber <= 1} title="Previous page">‹</button>
                    <span className="pdf-page-info">
                      <span className="pdf-page-info__current">{pageNumber}</span>
                      <span className="pdf-page-info__sep">/</span>
                      <span className="pdf-page-info__total">{numPages || '–'}</span>
                    </span>
                    <button type="button" className="pdf-btn" onClick={goToNextPage} disabled={pageNumber >= numPages} title="Next page">›</button>
                  </div>
                  <div className="pdf-toolbar__group">
                    <button type="button" className="pdf-btn" onClick={zoomOut} disabled={scale <= 0.4} title="Zoom out">−</button>
                    <button type="button" className="pdf-btn pdf-btn--zoom-label" onClick={resetZoom} title="Reset zoom">
                      {Math.round(scale * 100)}%
                    </button>
                    <button type="button" className="pdf-btn" onClick={zoomIn} disabled={scale >= 2.5} title="Zoom in">+</button>
                  </div>
                  <div className="pdf-toolbar__group">
                    <button type="button" className="pdf-btn pdf-btn--download" onClick={handleDownload} title="Download PDF">
                      ⬇ Download
                    </button>
                  </div>
                </div>
                <div className="pdf-viewport">
                  <Document
                    file={documentUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="pdf-loading"><div className="pdf-spinner" />Loading PDF…</div>}
                    error={<div className="pdf-page-error">Failed to load PDF.</div>}
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={<div className="pdf-page-loading">Rendering page…</div>}
                      className="pdf-page"
                    />
                  </Document>
                </div>
              </>
            ) : (
              <div className="pdf-shell--center">
                <p className="pdf-empty">
                  {formData.loanDocument?.ID
                    ? 'Document will load when task data is available.'
                    : 'No document attachment provided.'}
                </p>
              </div>
            )}
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
