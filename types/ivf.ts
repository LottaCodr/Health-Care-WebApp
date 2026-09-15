import type { Patient } from "@/types/models";

export type IVFClinicType = "ivf" | "dermatology" | "nephrology" | "urology" | "other";

export type IVFCycleStatus =
    | "planned"
    | "stimulation"
    | "triggered"
    | "retrieval"
    | "fertilization"
    | "culture"
    | "transfer"
    | "luteal"
    | "completed"
    | "paused"
    | "cancelled";

export type IVFTreatmentType = "ivf" | "icsi" | "fet" | "iui" | "egg-freezing" | "sperm-freezing";
export type IVFCycleType = "fresh" | "frozen";

export interface IVFCycle {
    id: string;
    facility_id: string;
    patient_id: string;
    partner_patient_id?: string | null;
    cycle_number: number;
    treatment_type: IVFTreatmentType;
    cycle_type: IVFCycleType;
    status: IVFCycleStatus;
    indication?: string | null;
    protocol?: string | null;
    planned_start_date?: string | null;
    stimulation_start_date?: string | null;
    trigger_at?: string | null;
    retrieval_at?: string | null;
    transfer_at?: string | null;
    outcome?: string | null;
    notes?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
    patient?: Patient;
    partner?: Patient;
}

export interface IVFMonitoringVisit {
    id: string;
    cycle_id: string;
    visit_at: string;
    cycle_day?: number | null;
    endometrial_thickness_mm?: number | null;
    endometrial_pattern?: string | null;
    right_follicles?: Array<{ size_mm?: number; count?: number }>;
    left_follicles?: Array<{ size_mm?: number; count?: number }>;
    estradiol_pg_ml?: number | null;
    lh_iu_l?: number | null;
    progesterone_ng_ml?: number | null;
    medication_changes?: Array<{ name: string; dose?: string; action?: string }>;
    assessment?: string | null;
    plan?: string | null;
    clinician_id?: string | null;
    created_at?: string;
}

export type IVFSpecimenSource = "husband" | "donor" | "surgically-retrieved" | "other";
export type IVFSurgicalSource = "PESA" | "TESA" | "TESE" | "Micro-TESE" | "other";

export interface IVFSemenSample {
    id: string;
    cycle_id: string;
    provider_patient_id?: string | null;
    sample_code?: string | null;
    specimen?: string | null;
    source: IVFSpecimenSource;
    surgical_type?: IVFSurgicalSource | null;
    sample_state: "fresh" | "frozen";
    abstinence_days?: number | null;
    collection_method?: string | null;
    collection_location?: string | null;
    collected_at?: string | null;
    delivered_at?: string | null;
    volume_ml?: number | null;
    ph?: number | null;
    viscosity?: string | null;
    colour?: string | null;
    liquefaction_minutes?: number | null;
    concentration_million_ml?: number | null;
    total_sperm_count_million?: number | null;
    total_motility_percent?: number | null;
    progressive_motility_percent?: number | null;
    non_progressive_motility_percent?: number | null;
    immotile_percent?: number | null;
    morphology_normal_percent?: number | null;
    vitality_percent?: number | null;
    agglutination?: string | null;
    debris_round_cells?: string | null;
    preparation_indication?: "IVF" | "ICSI" | "other" | null;
    preparation_method?: string | null;
    media_used?: string | null;
    media_lot_number?: string | null;
    centrifugation_speed_rpm?: number | null;
    centrifugation_time_minutes?: number | null;
    final_volume_ml?: number | null;
    final_concentration_million_ml?: number | null;
    motile_sperm_count_million?: number | null;
    final_progressive_motility_percent?: number | null;
    rapid_progressive_percent?: number | null;
    slow_progressive_percent?: number | null;
    suitable_for_ivf?: boolean | null;
    suitable_for_icsi?: boolean | null;
    frozen?: boolean;
    freezing_method?: string | null;
    number_of_vials?: number | null;
    storage_location?: string | null;
    frozen_at?: string | null;
    serology?: Record<string, string>;
    genetic_screening?: Record<string, string>;
    comments?: string | null;
    operator_id?: string | null;
    witness_id?: string | null;
    created_at?: string;
}

export interface IVFOocyteRetrieval {
    id: string;
    cycle_id: string;
    retrieval_at: string;
    trigger_used?: string | null;
    trigger_at?: string | null;
    interval_post_trigger_hours?: number | null;
    oocyte_source?: "own" | "donor" | "other" | null;
    stimulation_protocol?: string | null;
    right_follicle_count?: number | null;
    left_follicle_count?: number | null;
    oocytes_retrieved?: number | null;
    difficult_access?: boolean;
    aspiration_needle?: string | null;
    aspiration_pressure?: string | null;
    flushing_medium?: string | null;
    handling_media?: string | null;
    media_lot_number?: string | null;
    complications?: string[];
    comments?: string | null;
    clinician_id?: string | null;
    embryologist_id?: string | null;
    witness_id?: string | null;
    created_at?: string;
}

export type IVFOocyteMaturity = "MII" | "MI" | "GV" | "degenerated" | "other";

export interface IVFOocyte {
    id: string;
    cycle_id: string;
    retrieval_id: string;
    oocyte_number: number;
    maturity?: IVFOocyteMaturity | null;
    insemination_type?: "ICSI" | "conventional" | "not-inseminated" | null;
    insemination_at?: string | null;
    pn_status?: string | null;
    status?: string | null;
    comments?: string | null;
    operator_id?: string | null;
    witness_id?: string | null;
    created_at?: string;
}

export type IVFEmbryoStatus = "in-culture" | "biopsied" | "transferred" | "frozen" | "discarded" | "arrested";

export interface IVFEmbryo {
    id: string;
    cycle_id: string;
    oocyte_id?: string | null;
    embryo_number: number;
    day?: number | null;
    pn_status?: string | null;
    stage?: string | null;
    icm_grade?: string | null;
    te_grade?: string | null;
    quality?: string | null;
    status: IVFEmbryoStatus;
    transfer_type?: "fresh" | "frozen" | null;
    transferred_at?: string | null;
    biopsied_at?: string | null;
    pgt_type?: "PGT-A" | "PGT-M" | "PGT-SR" | null;
    pgt_result?: string | null;
    pgt_status?: "euploid" | "aneuploid" | "mosaic" | "inconclusive" | "not-tested" | null;
    pgt_lab?: string | null;
    frozen_at?: string | null;
    freeze_method?: string | null;
    cryodevice_id?: string | null;
    comments?: string | null;
    operator_id?: string | null;
    witness_id?: string | null;
    created_at?: string;
}

export type IVFCryoMaterial = "sperm" | "oocyte" | "embryo";

export interface IVFCryoInventory {
    id: string;
    facility_id: string;
    cycle_id: string;
    patient_id: string;
    material_type: IVFCryoMaterial;
    semen_sample_id?: string | null;
    oocyte_id?: string | null;
    embryo_id?: string | null;
    cryodevice_id: string;
    units: number;
    stage?: string | null;
    grade?: string | null;
    method?: string | null;
    tank: string;
    canister?: string | null;
    goblet?: string | null;
    slot?: string | null;
    stored_at: string;
    consent_until?: string | null;
    status: "stored" | "reserved" | "warmed" | "transferred" | "discarded" | "missing";
    disposition?: string | null;
    operator_id?: string | null;
    witness_id?: string | null;
    created_at?: string;
}

export interface IVFConsent {
    id: string;
    cycle_id: string;
    patient_id: string;
    consent_type: string;
    version: string;
    status: "pending" | "signed" | "withdrawn" | "expired";
    signed_at?: string | null;
    expires_at?: string | null;
    document_id?: string | null;
    witness_id?: string | null;
    notes?: string | null;
    created_at?: string;
}

export interface IVFOutcome {
    id: string;
    cycle_id: string;
    beta_hcg_date?: string | null;
    beta_hcg_result?: string | null;
    clinical_pregnancy_date?: string | null;
    fetal_heartbeat_date?: string | null;
    pregnancy_outcome?: string | null;
    live_birth_date?: string | null;
    notes?: string | null;
    recorded_by?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface IVFWorkspaceData {
    cycles: IVFCycle[];
    monitoring: IVFMonitoringVisit[];
    semen: IVFSemenSample[];
    retrievals: IVFOocyteRetrieval[];
    oocytes: IVFOocyte[];
    embryos: IVFEmbryo[];
    cryo: IVFCryoInventory[];
    consents: IVFConsent[];
}

export interface IVFWitness {
    id: string;
    name: string;
    role?: string | null;
    department?: string | null;
}

export interface IVFPatientSearchResult {
    id: string;
    name: string;
    hospital_number?: string;
    birth_date?: string;
    gender?: string;
    phone?: string;
}
