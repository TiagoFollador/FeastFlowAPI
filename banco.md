erDiagram
    Tenant ||--o{ User : has
    Tenant ||--o{ EventLocation : has
    Tenant ||--o{ Partner : has
    Tenant ||--o{ PricingRule : has
    Tenant ||--o{ StaffingRule : has
    Tenant ||--o{ Budget : owns
    Tenant ||--o{ BudgetItem : secures
    Tenant ||--o{ BudgetSnapshot : secures
    Tenant ||--o{ PartnerService : secures
    User ||--o{ Budget : creates
    EventLocation ||--o{ Budget : hosts
    Partner ||--o{ PartnerService : provides
    Budget ||--o{ BudgetItem : contains
    Budget ||--o{ BudgetSnapshot : archives

    Tenant {
        uuid id PK
        varchar name
        varchar cnpj "Unique"
        numeric global_margin "NUMERIC(19,4)"
        timestamp created_at
    }
    User {
        uuid id PK
        uuid tenant_id FK
        varchar role
        varchar email
        varchar password_hash
    }
    EventLocation {
        uuid id PK
        uuid tenant_id FK
        varchar name
        varchar type "Enum: In-House, Out-House"
        integer capacity
        numeric transport_multiplier "NUMERIC(19,4)"
    }
    Partner {
        uuid id PK
        uuid tenant_id FK
        varchar name
        varchar specialty
    }
    PartnerService {
        uuid id PK
        uuid partner_id FK
        uuid tenant_id FK
        varchar name
        numeric base_cost "NUMERIC(19,4)"
        numeric markup_margin "NUMERIC(19,4)"
    }
    PricingRule {
        uuid id PK
        uuid tenant_id FK
        varchar rule_name
        numeric multiplier "NUMERIC(19,4)"
    }
    StaffingRule {
        uuid id PK
        uuid tenant_id FK
        varchar role "Ex: Garçom, Busser"
        integer guest_ratio
        numeric base_hourly_rate "NUMERIC(19,4)"
    }
    Budget {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid location_id FK
        varchar event_nature "Enum: Privado, Feira, Congresso"
        integer guest_count
        numeric total_cost "NUMERIC(19,4)"
        numeric final_price "NUMERIC(19,4)"
        varchar status
        integer version_token "Controle OCC"
        timestamp created_at
    }
    BudgetItem {
        uuid id PK
        uuid budget_id FK
        uuid tenant_id FK
        varchar item_type "Staff, Catering, Partner"
        uuid reference_id
        integer quantity
        numeric unit_cost "NUMERIC(19,4)"
        numeric applied_markup "NUMERIC(19,4)"
        numeric final_row_price "NUMERIC(19,4)"
    }
    BudgetSnapshot {
        uuid id PK
        uuid budget_id FK
        uuid tenant_id FK
        jsonb payload "Cópia imutável do contrato"
        timestamp created_at
    }