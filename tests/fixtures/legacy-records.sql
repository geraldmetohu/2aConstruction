-- Synthetic records for the in-memory migration test only. No real customer data.
INSERT INTO "User" (id, email, "firstName", "lastName", "profileImage")
VALUES ('legacy-user', 'legacy@example.invalid', 'Legacy', 'Customer', '');
INSERT INTO "Client" (id, "userId", "fullName", email, phone, "houseNumber", street, postcode, "preferredContact", address)
VALUES ('00000000-0000-4000-8000-000000000001', 'legacy-user', 'Legacy Customer', 'legacy@example.invalid', 'test', '1', 'Example', 'TEST', 'email', 'Original address');
INSERT INTO "ClientProject" (id, "clientId", "projectType", "priceEstimated", "finalPrice", "formData", "adminSummary")
VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'extension', '£50k–£75k budget', 'Original agreed text', '{"original":"keep","uploads":["https://example.invalid/original.jpg"],"nested":{"value":12}}', 'Keep internal note');
INSERT INTO "ClientProjectPhase" (id, "clientProjectId", title, jobs, images, notes)
VALUES ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'Original phase', '["original task"]', ARRAY['https://example.invalid/phase.jpg'], 'Original notes');
INSERT INTO "Project" (id, name, description, status, images, category, "sourceClientProjectId")
VALUES ('legacy-portfolio-text-id', 'Original portfolio', 'Keep description', 'published', ARRAY['https://example.invalid/portfolio.jpg'], 'extention', '00000000-0000-4000-8000-000000000002');
INSERT INTO "Banner" (id, title, subtitle, "imageString") VALUES ('legacy-banner', 'Original banner', 'Original subtitle', 'https://example.invalid/banner.jpg');
INSERT INTO "BeforeAfter" (id, title, "imageStringBefore", "imageStringAfter") VALUES ('legacy-before-after', 'Original pair', 'https://example.invalid/before.jpg', 'https://example.invalid/after.jpg');
INSERT INTO "Contact" (id, name, email, phone, role, description, address, price) VALUES ('legacy-contact', 'Original contact', 'contact@example.invalid', 'test', 'labour', 'Keep trade', 'Keep address', 'Original rate text');
INSERT INTO "HeroVideo" (id, title, "videoUrl") VALUES ('legacy-hero', 'Original video', 'https://example.invalid/hero.mp4');
