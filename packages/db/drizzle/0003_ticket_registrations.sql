-- clients catalog (B2B customers of Brake Station)
CREATE TABLE clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          text NOT NULL CHECK (type IN ('refaccionaria','taller','mayorista','flotilla','otro')),
  city          text NOT NULL,
  branch        text NOT NULL CHECK (branch IN ('merida','villahermosa','tuxtla')),
  contact_name  text,
  contact_phone text,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clients_active_idx ON clients(active) WHERE active = true;
CREATE INDEX clients_branch_idx ON clients(branch);

-- ticket_registrations (photo + affiliation at activation)
CREATE TABLE ticket_registrations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code        text NOT NULL REFERENCES tickets(code) ON DELETE RESTRICT,
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  photo_url          text NOT NULL,
  photo_uploaded_at  timestamptz NOT NULL DEFAULT now(),
  affiliation_type   text NOT NULL CHECK (affiliation_type IN (
    'trabajador_cliente',
    'cliente_de_cliente',
    'cliente_directo'
  )),
  client_id          uuid REFERENCES clients(id),
  client_text        text,
  end_customer_name  text,
  end_customer_phone text,
  review_status      text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by        uuid REFERENCES users(id),
  reviewed_at        timestamptz,
  review_notes       text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (affiliation_type = 'cliente_directo' AND client_id IS NULL AND client_text IS NULL)
    OR (affiliation_type IN ('trabajador_cliente','cliente_de_cliente') AND (client_id IS NOT NULL OR client_text IS NOT NULL))
  ),
  CHECK (
    affiliation_type != 'cliente_de_cliente' OR end_customer_name IS NOT NULL
  )
);

CREATE INDEX ticket_registrations_ticket_idx ON ticket_registrations(ticket_code);
CREATE INDEX ticket_registrations_user_idx ON ticket_registrations(user_id);
CREATE INDEX ticket_registrations_client_idx ON ticket_registrations(client_id);
CREATE INDEX ticket_registrations_review_status_idx ON ticket_registrations(review_status) WHERE review_status = 'pending';
CREATE UNIQUE INDEX ticket_registrations_active_idx ON ticket_registrations(ticket_code) WHERE review_status != 'rejected';

-- ALTER tickets to link registration
ALTER TABLE tickets
  ADD COLUMN registration_id uuid REFERENCES ticket_registrations(id),
  ADD COLUMN registration_required boolean NOT NULL DEFAULT true;

-- Demo seed for clients
INSERT INTO clients (name, type, city, branch) VALUES
  ('Refaccionaria Demo Merida',    'refaccionaria', 'Merida',       'merida'),
  ('Taller Demo Villahermosa',     'taller',        'Villahermosa', 'villahermosa'),
  ('Mayorista Demo Tuxtla',        'mayorista',     'Tuxtla',       'tuxtla')
ON CONFLICT DO NOTHING;
