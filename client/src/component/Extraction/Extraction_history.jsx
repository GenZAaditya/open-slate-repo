import React, { useState, useEffect } from 'react';
import { useUser } from '../../UserContext';

const DocumentHistoryTable = () => {
  const { 
    documentHistory, 
    historyLoading, 
    historyError,
    fetchDocumentHistory,
    removeDocumentFromHistory,
    updateDocumentInHistory
  } = useUser();
  
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Optional: Fetch on component mount or when you want to refresh
  useEffect(() => {
    // This will use cached data if available, or fetch if needed
    fetchDocumentHistory();
  }, [fetchDocumentHistory]);

  const toggleRowExpansion = (docId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const getExtractedFields = (doc) => {
    const extractedData = doc.data?.data;
    if (!extractedData || typeof extractedData !== 'object') return [];
    return Object.keys(extractedData);
  };

  const renderExtractionResults = (doc) => {
    const extractedData = doc.data?.data;
    if (!extractedData) {
      return <div className="extraction-history__no-results">No extraction results available</div>;
    }

    return (
      <div className="extraction-history__results-container">
        <h4 className="extraction-history__results-title">Extracted Information for {doc.fileName}:</h4>
        <div className="extraction-history__results-grid">
          {Object.entries(extractedData).map(([key, value]) => (
            <div key={key} className="extraction-history__result-item">
              <div className="extraction-history__result-label">{key}:</div>
              <div className="extraction-history__result-value">{value}</div>
            </div>
          ))}
        </div>
        {doc.data?.extraction_metadata && (
          <div className="extraction-history__metadata">
            <h5 className="extraction-history__metadata-title">Processing Details:</h5>
            <div className="extraction-history__metadata-stats">
              <span className="extraction-history__metadata-stat">Pages: {doc.data.extraction_metadata.usage?.num_pages_extracted || 'N/A'}</span>
              <span className="extraction-history__metadata-stat">Document Tokens: {doc.data.extraction_metadata.usage?.num_document_tokens || 'N/A'}</span>
              <span className="extraction-history__metadata-stat">Output Tokens: {doc.data.extraction_metadata.usage?.num_output_tokens || 'N/A'}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleAction = async (action, doc) => {
    switch (action) {
      case 'download':
        window.open(doc.documentUrl, '_blank');
        break;
        
      case 'delete':
        if (window.confirm('Are you sure you want to delete this document?')) {
          try {
            console.log('Delete document:', doc);
            
            // TODO: Implement actual delete API call here
            // const response = await fetch(`${HISTORY_API_BASE}/delete/${doc.id}`, {
            //   method: 'DELETE'
            // });
            
            // For now, just remove from context
            removeDocumentFromHistory(doc.id);
            
            // You could also show a success message
            alert('Document deleted successfully!');
          } catch (error) {
            console.error('Error deleting document:', error);
            alert('Failed to delete document. Please try again.');
          }
        }
        break;
        
      case 'refresh':
        // Force refresh the document history
        await fetchDocumentHistory(true);
        break;
    }
  };

  // Handle loading state
  if (historyLoading && documentHistory.length === 0) {
    return (
      <div className="extraction-history__loading-container">
        <div className="extraction-history__loading-spinner"></div>
        <p>Loading document history...</p>
      </div>
    );
  }

  // Handle error state
  if (historyError && documentHistory.length === 0) {
    return (
      <div className="extraction-history__error-container">
        <div className="extraction-history__error-message">
          <p>Error loading document history: {historyError}</p>
          <button 
            onClick={() => fetchDocumentHistory(true)}
            className="extraction-history__retry-btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="extraction-history">
      <div className="extraction-history__header">
        <h2 className="extraction-history__title">Extraction History</h2>
        <p className="extraction-history__subtitle">View your document extraction results</p>
        <div className="extraction-history__header-actions">
          <button
            onClick={() => fetchDocumentHistory(true)}
            className="extraction-history__refresh-btn"
            disabled={historyLoading}
          >
            {historyLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {historyError && documentHistory.length > 0 && (
        <div className="extraction-history__error-banner">
          Failed to refresh: {historyError}
        </div>
      )}

      <div className="extraction-history__table-container">
        <table className="extraction-history__table">
          <thead className="extraction-history__table-header">
            <tr>
              <th className="extraction-history__table-th">File Name</th>
              <th className="extraction-history__table-th">Extracted Fields</th>
              <th className="extraction-history__table-th">Status</th>
              <th className="extraction-history__table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="extraction-history__table-body">
            {documentHistory.map((doc, index) => (
              <React.Fragment key={doc.id}>
                <tr className="extraction-history__table-row">
                  <td className="extraction-history__table-td">
                    <div className="extraction-history__file-name-info">
                      <span className="extraction-history__file-name-text">{doc.fileName}</span>
                      <span className="extraction-history__file-date">{doc.createdAt}</span>
                    </div>
                  </td>
                  <td className="extraction-history__table-td">
                    <div className="extraction-history__extracted-fields">
                      {getExtractedFields(doc).map((field, idx) => (
                        <span key={idx} className="extraction-history__field-tag">
                          {field}
                        </span>
                      ))}
                      {getExtractedFields(doc).length === 0 && (
                        <span className="extraction-history__no-fields">No fields extracted</span>
                      )}
                    </div>
                  </td>
                  <td className="extraction-history__table-td">
                    <span
                      className={`extraction-history__status-badge ${
                        doc.status === 'SUCCESS'
                          ? 'extraction-history__status-badge--success'
                          : doc.status === 'PENDING'
                          ? 'extraction-history__status-badge--pending'
                          : 'extraction-history__status-badge--error'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="extraction-history__table-td">
                    <div className="extraction-history__actions-buttons">
                      <button
                        onClick={() => handleAction('download', doc)}
                        className="extraction-history__action-btn extraction-history__download-btn"
                        title="Download PDF"
                      >
                        📄
                      </button>
                      {doc.status === 'SUCCESS' && (
                        <button
                          onClick={() => toggleRowExpansion(doc.id)}
                          className={`extraction-history__action-btn extraction-history__view-btn ${
                            expandedRows.has(doc.id) ? 'extraction-history__view-btn--active' : ''
                          }`}
                          title={expandedRows.has(doc.id) ? 'Hide Results' : 'View Results'}
                        >
                          {expandedRows.has(doc.id) ? '▼' : '▶'}
                        </button>
                      )}
                      <button
                        onClick={() => handleAction('delete', doc)}
                        className="extraction-history__action-btn extraction-history__delete-btn"
                        title="Delete Document"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedRows.has(doc.id) && (
                  <tr className="extraction-history__expanded-row">
                    <td colSpan="4" className="extraction-history__expanded-content">
                      {renderExtractionResults(doc)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {documentHistory.length === 0 && !historyLoading && (
        <div className="extraction-history__empty-state">
          <div className="extraction-history__empty-icon">📄</div>
          <p className="extraction-history__empty-message">No documents found</p>
          <p className="extraction-history__empty-subtitle">Start by extracting data from your first document</p>
        </div>
      )}
    </div>
  );
};

export default DocumentHistoryTable;