
export const scbKnowledgeBase = `
INFO: SCB Medical College & Hospital, Cuttack (Sri Ramachandra Bhanja Medical College).
ESTABLISHED: 1944.
LOCATION: Mangalabag, Cuttack, Odisha, 753007.

MASTER LANDMARK LIST (CALIBRATED TO SATELLITE IMAGE):
- SCB Main Entrance (Mangalabag Gate): 20.4815, 85.8752
- SCB Main Hospital Hub (Canal Road): 20.4795, 85.8814
- OPD Registration Counter: 20.4805, 85.8788 (Floor 0)
- Department of Medicine: 20.4813, 85.8778
- Department of Anatomy: 20.4820, 85.8805
- Blood Bank: 20.4810, 85.8805
- Regional Spinal Injury Centre: 20.4828, 85.8792
- Department of Skin & VD: 20.4815, 85.8812
- SCB Central Library: 20.4798, 85.8778
- Emergency / Trauma Center: 20.4798, 85.8805
- New OPD Building: 20.4806, 85.8785

BUILDING SCHEMES (VERTICAL LAYOUTS):
1. **New Multi-Story OPD Building**:
   - Floor 0 (Ground): Registration Counters, Pharmacy (Niramaya), Help Desk (Blue Color).
   - Floor 1: General Medicine, Skin (Dermatology).
   - Floor 2: Orthopedics, Physiotherapy.
   - Floor 3: Pediatrics, O&G (Obstetrics).
   - Floor 4: ENT, Ophthalmology (Eye).
   - Internal Landmarks: "Central Elevator Bank", "Main Staircase".

2. **Super Speciality Block (SSB)**:
   - Floor 0: Reception, Cash Counter.
   - Floor 1: Nephrology, Dialysis.
   - Floor 2: Neurology, Neurosurgery.
   - Floor 3: Urology.
   - Floor 4: Cardiology, CTVS.
   - Internal Landmarks: "Glass Elevators".

NAVIGATION RULES FOR AI:
- ALWAYS use these Master Landmarks when a user searches for a department.
- If destination is above Floor 0, guide user to Internal Landmarks FIRST.
`;
