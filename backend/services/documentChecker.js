const Document = require('../models/Document');

const REASONS = [
  'Document image is unclear',
  'Required information could not be verified',
  'Document appears to be expired',
];

function emit(io, document, event) {
  if (!io || !document?.brokerageId) return;
  io.to(`brokerage:${document.brokerageId}`).emit(event, { document });
}

/**
 * Demo-only async checker. A real implementation would enqueue this work in
 * BullMQ/Redis or a managed job service instead of using setTimeout.
 */
function startFakeDocumentCheck(documentId, io) {
  setTimeout(async () => {
    try {
      const checking = await Document.findByIdAndUpdate(
        documentId,
        { $set: { status: 'Checking', failureReason: undefined } },
        { new: true }
      );
      if (!checking) return;
      emit(io, checking, 'document:checking');

      const delay = 3000 + Math.floor(Math.random() * 12000);
      setTimeout(async () => {
        try {
          const approved = Math.random() >= 0.3;
          const updated = await Document.findByIdAndUpdate(
            documentId,
            {
              $set: approved
                ? { status: 'Approved', failureReason: undefined }
                : { status: 'Rejected', failureReason: REASONS[Math.floor(Math.random() * REASONS.length)] },
            },
            { new: true }
          );
          if (updated) emit(io, updated, approved ? 'document:approved' : 'document:rejected');
        } catch (error) {
          console.error('Fake document check failed:', error.message);
        }
      }, delay);
    } catch (error) {
      console.error('Fake document check could not start:', error.message);
    }
  }, 100);
}

module.exports = { startFakeDocumentCheck };
