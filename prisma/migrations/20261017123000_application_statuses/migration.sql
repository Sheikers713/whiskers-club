-- The admin now offers New, Interview, Trial period (MEETING), Approved, Rejected.
UPDATE "Application" SET "status" = 'INTERVIEW' WHERE "status" = 'CONTACTED';
UPDATE "Application" SET "status" = 'APPROVED' WHERE "status" = 'COMPLETED';
UPDATE "Application" SET "status" = 'REJECTED' WHERE "status" = 'WITHDRAWN';
