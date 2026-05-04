/** Colorado zip code centroids (approximate lat/lng from ZCTA data) */
export const CO_ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  // === Denver Metro Core (800xx) ===
  '80002': { lat: 39.80, lng: -105.08 },  // Arvada
  '80003': { lat: 39.83, lng: -105.05 },  // Arvada
  '80004': { lat: 39.81, lng: -105.12 },  // Arvada
  '80005': { lat: 39.87, lng: -105.13 },  // Arvada
  '80007': { lat: 39.83, lng: -105.18 },  // Arvada
  '80010': { lat: 39.73, lng: -104.87 },  // Aurora
  '80011': { lat: 39.74, lng: -104.82 },  // Aurora
  '80012': { lat: 39.70, lng: -104.84 },  // Aurora
  '80013': { lat: 39.66, lng: -104.82 },  // Aurora
  '80014': { lat: 39.66, lng: -104.86 },  // Aurora
  '80015': { lat: 39.63, lng: -104.79 },  // Aurora
  '80016': { lat: 39.58, lng: -104.75 },  // Aurora
  '80017': { lat: 39.70, lng: -104.79 },  // Aurora
  '80018': { lat: 39.72, lng: -104.73 },  // Aurora
  '80019': { lat: 39.78, lng: -104.74 },  // Aurora
  '80020': { lat: 39.93, lng: -105.07 },  // Broomfield
  '80021': { lat: 39.89, lng: -105.11 },  // Broomfield
  '80022': { lat: 39.85, lng: -104.91 },  // Commerce City
  '80023': { lat: 39.97, lng: -104.97 },  // Broomfield
  '80024': { lat: 39.82, lng: -104.93 },  // Dupont
  '80026': { lat: 40.00, lng: -105.15 },  // Lafayette
  '80027': { lat: 39.95, lng: -105.18 },  // Louisville
  '80030': { lat: 39.83, lng: -105.03 },  // Westminster
  '80031': { lat: 39.87, lng: -105.04 },  // Westminster
  '80033': { lat: 39.77, lng: -105.10 },  // Wheat Ridge
  '80034': { lat: 39.79, lng: -105.10 },  // Wheat Ridge
  '80035': { lat: 39.84, lng: -105.03 },  // Westminster
  '80036': { lat: 39.83, lng: -105.03 },  // Westminster
  '80038': { lat: 39.94, lng: -105.07 },  // Broomfield
  '80040': { lat: 39.74, lng: -104.82 },  // Aurora
  '80041': { lat: 39.70, lng: -104.82 },  // Aurora
  '80042': { lat: 39.74, lng: -104.82 },  // Aurora
  '80044': { lat: 39.70, lng: -104.82 },  // Aurora
  '80045': { lat: 39.75, lng: -104.84 },  // Aurora (Anschutz)
  '80046': { lat: 39.58, lng: -104.75 },  // Aurora
  '80047': { lat: 39.70, lng: -104.82 },  // Aurora

  // === Denver (802xx) ===
  '80110': { lat: 39.65, lng: -104.97 },  // Englewood
  '80111': { lat: 39.62, lng: -104.89 },  // Englewood / Greenwood Village
  '80112': { lat: 39.58, lng: -104.87 },  // Englewood / Centennial
  '80113': { lat: 39.64, lng: -104.95 },  // Englewood
  '80120': { lat: 39.60, lng: -105.00 },  // Littleton
  '80121': { lat: 39.61, lng: -104.95 },  // Littleton
  '80122': { lat: 39.58, lng: -104.95 },  // Littleton / Centennial
  '80123': { lat: 39.60, lng: -105.07 },  // Littleton
  '80124': { lat: 39.54, lng: -104.88 },  // Lone Tree
  '80125': { lat: 39.50, lng: -105.04 },  // Littleton / Highlands Ranch
  '80126': { lat: 39.55, lng: -104.99 },  // Highlands Ranch
  '80127': { lat: 39.62, lng: -105.15 },  // Littleton
  '80128': { lat: 39.59, lng: -105.10 },  // Littleton
  '80129': { lat: 39.52, lng: -104.93 },  // Highlands Ranch
  '80130': { lat: 39.54, lng: -104.92 },  // Highlands Ranch
  '80131': { lat: 39.49, lng: -104.89 },  // Louviers
  '80134': { lat: 39.46, lng: -104.81 },  // Parker
  '80135': { lat: 39.37, lng: -105.06 },  // Sedalia
  '80136': { lat: 39.73, lng: -104.49 },  // Strasburg
  '80137': { lat: 39.58, lng: -104.72 },  // Watkins / Foxfield
  '80138': { lat: 39.51, lng: -104.76 },  // Parker
  '80150': { lat: 39.65, lng: -104.97 },  // Englewood
  '80151': { lat: 39.65, lng: -104.97 },  // Englewood
  '80155': { lat: 39.58, lng: -104.95 },  // Centennial
  '80160': { lat: 39.61, lng: -104.95 },  // Littleton
  '80161': { lat: 39.58, lng: -104.95 },  // Littleton
  '80162': { lat: 39.58, lng: -105.10 },  // Littleton
  '80163': { lat: 39.40, lng: -104.87 },  // Castle Rock
  '80165': { lat: 39.58, lng: -104.87 },  // Centennial
  '80166': { lat: 39.58, lng: -104.87 },  // Centennial

  // === Denver City Proper (802xx) ===
  '80201': { lat: 39.74, lng: -104.98 },  // Denver (downtown)
  '80202': { lat: 39.75, lng: -104.99 },  // Denver (downtown)
  '80203': { lat: 39.73, lng: -104.98 },  // Denver (Capitol Hill)
  '80204': { lat: 39.74, lng: -105.01 },  // Denver (West Colfax)
  '80205': { lat: 39.76, lng: -104.96 },  // Denver (Five Points)
  '80206': { lat: 39.73, lng: -104.95 },  // Denver (Cherry Creek)
  '80207': { lat: 39.76, lng: -104.92 },  // Denver (Park Hill)
  '80209': { lat: 39.71, lng: -104.96 },  // Denver (Washington Park)
  '80210': { lat: 39.68, lng: -104.96 },  // Denver (University Hills)
  '80211': { lat: 39.77, lng: -105.01 },  // Denver (Highland)
  '80212': { lat: 39.78, lng: -105.05 },  // Denver (Edgewater)
  '80214': { lat: 39.74, lng: -105.07 },  // Denver (Edgewater / Lakewood)
  '80215': { lat: 39.74, lng: -105.11 },  // Denver (Lakewood)
  '80216': { lat: 39.78, lng: -104.95 },  // Denver (Elyria-Swansea)
  '80217': { lat: 39.74, lng: -104.98 },  // Denver
  '80218': { lat: 39.73, lng: -104.97 },  // Denver (City Park West)
  '80219': { lat: 39.70, lng: -105.03 },  // Denver (Westwood)
  '80220': { lat: 39.73, lng: -104.91 },  // Denver (Lowry)
  '80221': { lat: 39.83, lng: -105.00 },  // Denver (Federal Heights)
  '80222': { lat: 39.67, lng: -104.93 },  // Denver (Glendale)
  '80223': { lat: 39.70, lng: -105.00 },  // Denver (Baker)
  '80224': { lat: 39.68, lng: -104.90 },  // Denver
  '80226': { lat: 39.70, lng: -105.08 },  // Lakewood
  '80227': { lat: 39.66, lng: -105.09 },  // Lakewood
  '80228': { lat: 39.69, lng: -105.14 },  // Lakewood (Denver Federal Center)
  '80229': { lat: 39.86, lng: -104.96 },  // Thornton
  '80230': { lat: 39.71, lng: -104.90 },  // Denver (Lowry)
  '80231': { lat: 39.66, lng: -104.88 },  // Denver
  '80232': { lat: 39.67, lng: -105.07 },  // Lakewood
  '80233': { lat: 39.90, lng: -104.97 },  // Northglenn
  '80234': { lat: 39.91, lng: -105.00 },  // Northglenn
  '80235': { lat: 39.64, lng: -105.08 },  // Lakewood
  '80236': { lat: 39.66, lng: -105.02 },  // Denver (Marston)
  '80237': { lat: 39.64, lng: -104.91 },  // Denver
  '80238': { lat: 39.77, lng: -104.89 },  // Denver (Stapleton / Central Park)
  '80239': { lat: 39.78, lng: -104.84 },  // Denver (Montbello)
  '80241': { lat: 39.93, lng: -104.95 },  // Thornton
  '80246': { lat: 39.69, lng: -104.93 },  // Denver
  '80247': { lat: 39.69, lng: -104.88 },  // Denver
  '80249': { lat: 39.78, lng: -104.77 },  // Denver (DIA area / Green Valley Ranch)
  '80260': { lat: 39.87, lng: -105.00 },  // Westminster
  '80264': { lat: 39.75, lng: -104.99 },  // Denver

  // === Castle Rock / Douglas County ===
  '80104': { lat: 39.38, lng: -104.85 },  // Castle Rock
  '80108': { lat: 39.38, lng: -104.85 },  // Castle Rock
  '80109': { lat: 39.37, lng: -104.85 },  // Castle Rock

  // === Jefferson County / Mountains ===
  '80401': { lat: 39.74, lng: -105.20 },  // Golden
  '80402': { lat: 39.76, lng: -105.22 },  // Golden
  '80403': { lat: 39.81, lng: -105.22 },  // Golden
  '80419': { lat: 39.66, lng: -105.24 },  // Idledale
  '80421': { lat: 39.42, lng: -105.53 },  // Bailey
  '80422': { lat: 39.85, lng: -105.53 },  // Black Hawk
  '80425': { lat: 39.27, lng: -105.10 },  // Buffalo Creek
  '80427': { lat: 39.84, lng: -105.64 },  // Empire
  '80432': { lat: 39.50, lng: -105.87 },  // Grant (incl. parts near Fairplay)
  '80433': { lat: 39.44, lng: -105.32 },  // Conifer
  '80436': { lat: 39.79, lng: -105.68 },  // Dumont
  '80437': { lat: 39.53, lng: -105.33 },  // Evergreen
  '80439': { lat: 39.63, lng: -105.35 },  // Evergreen
  '80448': { lat: 39.43, lng: -105.67 },  // Grant
  '80452': { lat: 39.73, lng: -105.55 },  // Idaho Springs
  '80453': { lat: 39.67, lng: -105.26 },  // Idledale
  '80454': { lat: 39.64, lng: -105.24 },  // Indian Hills
  '80457': { lat: 39.63, lng: -105.30 },  // Kittredge
  '80465': { lat: 39.63, lng: -105.19 },  // Morrison
  '80470': { lat: 39.37, lng: -105.37 },  // Pine

  // === Boulder Area (803xx) ===
  '80301': { lat: 40.03, lng: -105.24 },  // Boulder
  '80302': { lat: 40.02, lng: -105.29 },  // Boulder
  '80303': { lat: 39.99, lng: -105.23 },  // Boulder
  '80304': { lat: 40.05, lng: -105.28 },  // Boulder
  '80305': { lat: 39.98, lng: -105.26 },  // Boulder
  '80309': { lat: 40.01, lng: -105.27 },  // Boulder (CU campus)
  '80310': { lat: 40.01, lng: -105.27 },  // Boulder
  '80314': { lat: 40.01, lng: -105.27 },  // Boulder
  '80501': { lat: 40.17, lng: -105.10 },  // Longmont
  '80502': { lat: 40.18, lng: -105.08 },  // Longmont
  '80503': { lat: 40.15, lng: -105.18 },  // Longmont (Niwot area)
  '80504': { lat: 40.17, lng: -105.00 },  // Longmont
  '80510': { lat: 40.20, lng: -105.47 },  // Allenspark
  '80513': { lat: 40.27, lng: -105.06 },  // Berthoud
  '80514': { lat: 40.11, lng: -104.95 },  // Dacono
  '80516': { lat: 40.08, lng: -104.94 },  // Erie
  '80520': { lat: 40.23, lng: -104.73 },  // Firestone
  '80530': { lat: 40.34, lng: -105.01 },  // Frederick
  '80534': { lat: 40.30, lng: -104.96 },  // Johnstown
  '80540': { lat: 40.24, lng: -105.37 },  // Lyons
  '80544': { lat: 40.11, lng: -105.16 },  // Niwot
  '80550': { lat: 40.38, lng: -104.80 },  // Windsor

  // === Colorado Springs Area (808xx-809xx) ===
  '80801': { lat: 38.97, lng: -103.22 },  // Anton
  '80808': { lat: 38.94, lng: -104.52 },  // Calhan
  '80809': { lat: 38.89, lng: -104.98 },  // Cascade
  '80813': { lat: 38.73, lng: -105.09 },  // Cripple Creek
  '80814': { lat: 38.82, lng: -105.06 },  // Divide
  '80816': { lat: 38.72, lng: -105.24 },  // Florissant
  '80817': { lat: 38.73, lng: -104.77 },  // Fountain
  '80819': { lat: 38.83, lng: -105.03 },  // Green Mountain Falls
  '80820': { lat: 38.59, lng: -105.39 },  // Guffey
  '80827': { lat: 38.86, lng: -105.13 },  // Lake George
  '80829': { lat: 38.85, lng: -104.97 },  // Manitou Springs
  '80831': { lat: 38.96, lng: -104.59 },  // Peyton
  '80832': { lat: 39.00, lng: -104.40 },  // Ramah
  '80833': { lat: 38.68, lng: -104.42 },  // Rush
  '80835': { lat: 39.01, lng: -104.72 },  // Yoder
  '80840': { lat: 38.99, lng: -104.86 },  // USAF Academy
  '80860': { lat: 38.76, lng: -105.16 },  // Victor
  '80863': { lat: 39.05, lng: -104.95 },  // Woodland Park
  '80864': { lat: 38.82, lng: -104.66 },  // Yoder

  // === Colorado Springs City (809xx) ===
  '80901': { lat: 38.83, lng: -104.82 },  // Colorado Springs
  '80902': { lat: 38.74, lng: -104.84 },  // Colorado Springs (Broadmoor)
  '80903': { lat: 38.83, lng: -104.82 },  // Colorado Springs (Downtown)
  '80904': { lat: 38.86, lng: -104.88 },  // Colorado Springs (Old Colorado City)
  '80905': { lat: 38.82, lng: -104.85 },  // Colorado Springs
  '80906': { lat: 38.79, lng: -104.87 },  // Colorado Springs (Broadmoor)
  '80907': { lat: 38.88, lng: -104.83 },  // Colorado Springs
  '80908': { lat: 39.02, lng: -104.74 },  // Colorado Springs (Briargate N)
  '80909': { lat: 38.85, lng: -104.78 },  // Colorado Springs
  '80910': { lat: 38.80, lng: -104.77 },  // Colorado Springs
  '80911': { lat: 38.76, lng: -104.75 },  // Colorado Springs (Security-Widefield)
  '80913': { lat: 38.73, lng: -104.71 },  // Colorado Springs
  '80914': { lat: 38.82, lng: -104.73 },  // Colorado Springs
  '80915': { lat: 38.85, lng: -104.74 },  // Colorado Springs
  '80916': { lat: 38.79, lng: -104.73 },  // Colorado Springs
  '80917': { lat: 38.88, lng: -104.76 },  // Colorado Springs
  '80918': { lat: 38.91, lng: -104.78 },  // Colorado Springs
  '80919': { lat: 38.93, lng: -104.84 },  // Colorado Springs (Rockrimmon)
  '80920': { lat: 38.96, lng: -104.79 },  // Colorado Springs (Briargate)
  '80921': { lat: 39.01, lng: -104.82 },  // Colorado Springs (North)
  '80922': { lat: 38.92, lng: -104.71 },  // Colorado Springs
  '80923': { lat: 38.95, lng: -104.72 },  // Colorado Springs
  '80924': { lat: 38.99, lng: -104.76 },  // Colorado Springs
  '80925': { lat: 38.75, lng: -104.67 },  // Colorado Springs
  '80926': { lat: 38.72, lng: -104.89 },  // Colorado Springs (SW)
  '80927': { lat: 39.00, lng: -104.69 },  // Colorado Springs
  '80928': { lat: 38.68, lng: -104.63 },  // Colorado Springs
  '80929': { lat: 38.82, lng: -104.65 },  // Colorado Springs
  '80930': { lat: 38.80, lng: -104.61 },  // Colorado Springs
  '80938': { lat: 38.90, lng: -104.68 },  // Colorado Springs
  '80939': { lat: 38.83, lng: -104.82 },  // Colorado Springs
  '80951': { lat: 38.90, lng: -104.68 },  // Colorado Springs

  // === Pueblo Area (810xx) ===
  '81001': { lat: 38.28, lng: -104.60 },  // Pueblo
  '81003': { lat: 38.27, lng: -104.63 },  // Pueblo
  '81004': { lat: 38.23, lng: -104.63 },  // Pueblo
  '81005': { lat: 38.23, lng: -104.68 },  // Pueblo (Pueblo West area)
  '81006': { lat: 38.28, lng: -104.55 },  // Pueblo
  '81007': { lat: 38.31, lng: -104.70 },  // Pueblo West
  '81008': { lat: 38.34, lng: -104.62 },  // Pueblo
  '81019': { lat: 38.08, lng: -104.79 },  // Colorado City
  '81022': { lat: 38.07, lng: -104.60 },  // Boone / Avondale area
  '81023': { lat: 38.14, lng: -105.06 },  // Beulah
  '81025': { lat: 38.22, lng: -104.42 },  // Boone
  '81039': { lat: 38.05, lng: -103.75 },  // Fowler
  '81040': { lat: 37.77, lng: -104.53 },  // Gardner
  '81050': { lat: 37.99, lng: -103.62 },  // La Junta
  '81052': { lat: 38.07, lng: -102.62 },  // Lamar
  '81055': { lat: 37.60, lng: -104.84 },  // La Veta
  '81058': { lat: 38.12, lng: -103.52 },  // Las Animas
  '81062': { lat: 38.39, lng: -103.98 },  // Olney Springs
  '81063': { lat: 38.43, lng: -103.80 },  // Ordway
  '81067': { lat: 38.06, lng: -104.62 },  // Avondale
  '81069': { lat: 37.97, lng: -104.82 },  // Rye
  '81089': { lat: 37.59, lng: -104.60 },  // Walsenburg
  '81091': { lat: 37.17, lng: -104.35 },  // Trinidad

  // === Fort Collins / Northern Colorado (805xx) ===
  '80521': { lat: 40.59, lng: -105.09 },  // Fort Collins (West)
  '80524': { lat: 40.61, lng: -105.01 },  // Fort Collins (NE)
  '80525': { lat: 40.54, lng: -105.05 },  // Fort Collins (South)
  '80526': { lat: 40.55, lng: -105.10 },  // Fort Collins (SW)
  '80528': { lat: 40.49, lng: -105.01 },  // Fort Collins (South)
  '80535': { lat: 40.64, lng: -105.18 },  // Laporte
  '80536': { lat: 40.70, lng: -105.22 },  // Livermore
  '80537': { lat: 40.39, lng: -105.10 },  // Loveland
  '80538': { lat: 40.42, lng: -105.06 },  // Loveland
  '80539': { lat: 40.42, lng: -105.11 },  // Loveland
  '80541': { lat: 40.47, lng: -105.22 },  // Masonville
  '80543': { lat: 40.34, lng: -104.82 },  // Milliken
  '80545': { lat: 40.50, lng: -105.29 },  // Red Feather Lakes
  '80546': { lat: 40.46, lng: -104.80 },  // Severance
  '80547': { lat: 40.61, lng: -104.97 },  // Timnath
  '80549': { lat: 40.71, lng: -105.04 },  // Wellington
  '80553': { lat: 40.55, lng: -105.07 },  // Fort Collins
  '80612': { lat: 40.78, lng: -104.87 },  // Carr

  // === Greeley / Weld County (806xx) ===
  '80601': { lat: 39.97, lng: -104.83 },  // Brighton
  '80602': { lat: 39.99, lng: -104.82 },  // Brighton
  '80603': { lat: 40.03, lng: -104.81 },  // Brighton
  '80610': { lat: 40.45, lng: -104.72 },  // Ault
  '80611': { lat: 40.48, lng: -104.43 },  // Briggsdale
  '80615': { lat: 40.38, lng: -104.68 },  // Eaton
  '80620': { lat: 40.42, lng: -104.71 },  // Evans
  '80621': { lat: 40.14, lng: -104.77 },  // Fort Lupton
  '80623': { lat: 40.25, lng: -104.81 },  // Gilcrest
  '80624': { lat: 40.38, lng: -104.58 },  // Gill
  '80631': { lat: 40.42, lng: -104.75 },  // Greeley
  '80632': { lat: 40.45, lng: -104.73 },  // Greeley
  '80634': { lat: 40.45, lng: -104.80 },  // Greeley
  '80640': { lat: 39.86, lng: -104.87 },  // Henderson
  '80642': { lat: 40.04, lng: -104.72 },  // Hudson
  '80643': { lat: 40.05, lng: -104.59 },  // Keenesburg
  '80644': { lat: 40.36, lng: -104.60 },  // Kersey
  '80645': { lat: 40.31, lng: -104.66 },  // La Salle
  '80648': { lat: 40.53, lng: -104.53 },  // Nunn
  '80649': { lat: 40.15, lng: -104.36 },  // Orchard
  '80650': { lat: 40.38, lng: -104.63 },  // Pierce
  '80651': { lat: 40.27, lng: -104.73 },  // Platteville
  '80652': { lat: 40.21, lng: -104.34 },  // Roggen
  '80653': { lat: 40.27, lng: -103.98 },  // Weldona
  '80654': { lat: 40.15, lng: -104.08 },  // Wiggins

  // === Estes Park / Mountain Areas ===
  '80511': { lat: 40.35, lng: -105.56 },  // Estes Park
  '80512': { lat: 40.40, lng: -105.60 },  // Estes Park (RMNP area)
  '80517': { lat: 40.37, lng: -105.52 },  // Estes Park

  // === Eastern Plains (808xx) ===
  '80802': { lat: 39.10, lng: -103.13 },  // Arapahoe
  '80804': { lat: 39.28, lng: -103.76 },  // Arriba
  '80805': { lat: 39.36, lng: -102.44 },  // Bethune
  '80807': { lat: 39.30, lng: -102.22 },  // Burlington
  '80810': { lat: 39.22, lng: -103.07 },  // Cheyenne Wells area
  '80812': { lat: 39.31, lng: -103.36 },  // Boyero
  '80815': { lat: 39.33, lng: -103.60 },  // Flagler
  '80818': { lat: 39.34, lng: -103.45 },  // Genoa
  '80821': { lat: 39.02, lng: -103.37 },  // Hugo
  '80822': { lat: 39.61, lng: -102.28 },  // Idalia
  '80823': { lat: 38.82, lng: -103.68 },  // Karval
  '80824': { lat: 39.79, lng: -102.43 },  // Kirk
  '80825': { lat: 38.81, lng: -103.22 },  // Kit Carson
  '80828': { lat: 39.33, lng: -103.85 },  // Limon
  '80830': { lat: 39.16, lng: -104.26 },  // Matheson
  '80834': { lat: 39.28, lng: -103.21 },  // Seibert
  '80836': { lat: 39.30, lng: -103.04 },  // Stratton
  '80861': { lat: 38.78, lng: -102.96 },  // Wild Horse
  '80862': { lat: 39.36, lng: -102.90 },  // Vona

  // === San Luis Valley / Southern Colorado (811xx) ===
  '81101': { lat: 37.47, lng: -105.87 },  // Alamosa
  '81120': { lat: 37.15, lng: -106.01 },  // Antonito
  '81121': { lat: 37.03, lng: -107.04 },  // Arboles
  '81122': { lat: 37.28, lng: -107.01 },  // Bayfield
  '81123': { lat: 37.40, lng: -105.66 },  // Blanca
  '81125': { lat: 37.65, lng: -106.06 },  // Center
  '81128': { lat: 37.02, lng: -106.77 },  // Chromo
  '81129': { lat: 37.06, lng: -105.63 },  // Conejos
  '81130': { lat: 37.77, lng: -106.93 },  // Creede
  '81131': { lat: 37.56, lng: -105.70 },  // Crestone
  '81132': { lat: 37.67, lng: -106.37 },  // Del Norte
  '81133': { lat: 37.34, lng: -105.47 },  // Fort Garland
  '81136': { lat: 37.62, lng: -105.67 },  // Hooper
  '81137': { lat: 37.09, lng: -107.59 },  // Ignacio
  '81138': { lat: 37.09, lng: -105.58 },  // Jaroso
  '81140': { lat: 37.27, lng: -106.00 },  // La Jara
  '81141': { lat: 37.19, lng: -105.72 },  // Manassa
  '81143': { lat: 37.97, lng: -105.93 },  // Moffat
  '81144': { lat: 37.52, lng: -106.14 },  // Monte Vista
  '81146': { lat: 37.57, lng: -105.85 },  // Mosca (Great Sand Dunes)
  '81147': { lat: 37.27, lng: -107.01 },  // Pagosa Springs
  '81148': { lat: 37.18, lng: -106.10 },  // Romeo
  '81149': { lat: 37.83, lng: -106.38 },  // Saguache
  '81151': { lat: 37.23, lng: -105.80 },  // San Luis
  '81152': { lat: 37.10, lng: -105.42 },  // San Pablo
  '81154': { lat: 37.68, lng: -106.59 },  // South Fork
  '81155': { lat: 38.18, lng: -106.14 },  // Villa Grove

  // === Grand Junction / Western Slope (815xx) ===
  '81501': { lat: 39.07, lng: -108.55 },  // Grand Junction
  '81503': { lat: 39.06, lng: -108.63 },  // Grand Junction
  '81504': { lat: 39.08, lng: -108.49 },  // Grand Junction
  '81505': { lat: 39.11, lng: -108.61 },  // Grand Junction (Redlands)
  '81506': { lat: 39.10, lng: -108.55 },  // Grand Junction
  '81507': { lat: 39.01, lng: -108.65 },  // Grand Junction (Orchard Mesa)
  '81520': { lat: 39.10, lng: -108.42 },  // Clifton
  '81521': { lat: 39.05, lng: -108.73 },  // Fruita
  '81522': { lat: 38.87, lng: -108.97 },  // Gateway
  '81523': { lat: 38.92, lng: -108.79 },  // Glade Park
  '81524': { lat: 39.16, lng: -108.81 },  // Loma
  '81525': { lat: 39.16, lng: -108.95 },  // Mack
  '81526': { lat: 39.09, lng: -108.36 },  // Palisade

  // === Durango Area (813xx) ===
  '81301': { lat: 37.28, lng: -107.88 },  // Durango
  '81302': { lat: 37.31, lng: -107.92 },  // Durango
  '81303': { lat: 37.25, lng: -107.97 },  // Durango
  '81320': { lat: 37.49, lng: -108.82 },  // Cortez area (Arriola)
  '81321': { lat: 37.35, lng: -108.59 },  // Cortez
  '81323': { lat: 37.47, lng: -108.49 },  // Dolores
  '81324': { lat: 37.68, lng: -108.90 },  // Dove Creek
  '81325': { lat: 37.76, lng: -108.60 },  // Egnar
  '81326': { lat: 37.17, lng: -108.00 },  // Hesperus
  '81327': { lat: 37.52, lng: -108.64 },  // Lewis
  '81328': { lat: 37.28, lng: -108.49 },  // Mancos
  '81330': { lat: 37.25, lng: -108.50 },  // Mesa Verde NP
  '81332': { lat: 37.86, lng: -107.81 },  // Rico
  '81334': { lat: 37.35, lng: -108.01 },  // Towaoc
  '81335': { lat: 37.41, lng: -108.74 },  // Yellow Jacket

  // === Aspen / Glenwood Springs / Mountain Resort Areas (816xx) ===
  '81601': { lat: 39.55, lng: -107.33 },  // Glenwood Springs
  '81602': { lat: 39.55, lng: -107.33 },  // Glenwood Springs
  '81610': { lat: 40.16, lng: -109.00 },  // Dinosaur
  '81611': { lat: 39.19, lng: -106.82 },  // Aspen
  '81612': { lat: 39.19, lng: -106.82 },  // Aspen
  '81615': { lat: 39.21, lng: -106.94 },  // Snowmass Village
  '81620': { lat: 39.64, lng: -106.38 },  // Avon
  '81621': { lat: 39.37, lng: -107.08 },  // Basalt
  '81623': { lat: 39.26, lng: -107.22 },  // Carbondale
  '81624': { lat: 39.27, lng: -107.64 },  // Cedaredge (area)
  '81625': { lat: 40.48, lng: -107.56 },  // Craig
  '81630': { lat: 39.28, lng: -108.33 },  // De Beque
  '81631': { lat: 39.62, lng: -106.52 },  // Eagle
  '81632': { lat: 39.59, lng: -106.44 },  // Edwards
  '81633': { lat: 40.24, lng: -108.82 },  // Dinosaur area
  '81635': { lat: 39.53, lng: -107.79 },  // New Castle
  '81637': { lat: 39.73, lng: -106.85 },  // Gypsum
  '81638': { lat: 40.06, lng: -107.04 },  // Hamilton
  '81639': { lat: 40.48, lng: -107.26 },  // Hayden
  '81640': { lat: 40.60, lng: -107.05 },  // Hayden area
  '81641': { lat: 40.04, lng: -107.43 },  // Meeker
  '81642': { lat: 39.33, lng: -106.82 },  // Meredith
  '81643': { lat: 39.08, lng: -107.96 },  // Collbran
  '81645': { lat: 39.60, lng: -106.28 },  // Minturn
  '81646': { lat: 39.10, lng: -107.80 },  // Molina
  '81647': { lat: 39.56, lng: -107.54 },  // New Castle
  '81648': { lat: 39.96, lng: -108.53 },  // Rangely
  '81649': { lat: 39.48, lng: -106.42 },  // Red Cliff
  '81650': { lat: 39.53, lng: -107.78 },  // Rifle
  '81652': { lat: 39.47, lng: -107.67 },  // Silt
  '81653': { lat: 40.80, lng: -108.16 },  // Slater
  '81654': { lat: 39.22, lng: -107.00 },  // Snowmass
  '81655': { lat: 39.64, lng: -106.66 },  // Wolcott
  '81656': { lat: 39.20, lng: -106.95 },  // Woody Creek
  '81657': { lat: 39.64, lng: -106.37 },  // Vail
  '81658': { lat: 39.65, lng: -106.37 },  // Vail

  // === Steamboat Springs / NW Colorado (804xx) ===
  '80424': { lat: 39.48, lng: -106.04 },  // Breckenridge
  '80435': { lat: 39.63, lng: -105.92 },  // Dillon
  '80440': { lat: 39.22, lng: -105.99 },  // Fairplay
  '80443': { lat: 39.60, lng: -106.07 },  // Frisco
  '80446': { lat: 40.06, lng: -105.82 },  // Granby
  '80447': { lat: 40.15, lng: -105.84 },  // Grand Lake
  '80451': { lat: 40.06, lng: -105.91 },  // Hot Sulphur Springs
  '80459': { lat: 40.00, lng: -106.38 },  // Kremmling
  '80461': { lat: 39.24, lng: -106.31 },  // Leadville
  '80463': { lat: 39.84, lng: -106.67 },  // McCoy
  '80467': { lat: 40.15, lng: -106.83 },  // Oak Creek
  '80468': { lat: 39.87, lng: -106.15 },  // Parshall
  '80469': { lat: 40.19, lng: -106.97 },  // Phippsburg
  '80473': { lat: 40.28, lng: -106.06 },  // Rand
  '80477': { lat: 40.49, lng: -106.83 },  // Steamboat Springs
  '80478': { lat: 40.07, lng: -105.92 },  // Tabernash
  '80479': { lat: 40.04, lng: -106.74 },  // Toponas
  '80480': { lat: 40.79, lng: -106.36 },  // Walden
  '80482': { lat: 39.97, lng: -105.78 },  // Winter Park
  '80487': { lat: 40.47, lng: -106.82 },  // Steamboat Springs
  '80488': { lat: 40.47, lng: -106.82 },  // Steamboat Springs

  // === Telluride / Ouray / San Juan Mtns (814xx) ===
  '81401': { lat: 38.48, lng: -107.87 },  // Montrose
  '81403': { lat: 38.47, lng: -107.88 },  // Montrose
  '81410': { lat: 38.81, lng: -107.97 },  // Austin
  '81411': { lat: 38.35, lng: -108.90 },  // Bedrock
  '81413': { lat: 38.83, lng: -107.63 },  // Cedaredge
  '81414': { lat: 38.80, lng: -107.73 },  // Cedaredge area
  '81415': { lat: 38.74, lng: -107.56 },  // Crawford
  '81416': { lat: 38.73, lng: -108.07 },  // Delta
  '81418': { lat: 38.83, lng: -107.82 },  // Eckert
  '81419': { lat: 38.63, lng: -107.64 },  // Hotchkiss
  '81420': { lat: 38.67, lng: -107.52 },  // Lazear
  '81422': { lat: 38.36, lng: -108.38 },  // Naturita
  '81423': { lat: 38.00, lng: -108.06 },  // Norwood
  '81424': { lat: 38.26, lng: -108.50 },  // Nucla
  '81425': { lat: 38.42, lng: -107.72 },  // Olathe
  '81426': { lat: 38.02, lng: -108.25 },  // Ophir
  '81427': { lat: 38.02, lng: -107.67 },  // Ouray
  '81428': { lat: 38.86, lng: -107.42 },  // Paonia
  '81429': { lat: 38.34, lng: -108.67 },  // Paradox
  '81430': { lat: 37.94, lng: -107.81 },  // Placerville
  '81431': { lat: 38.18, lng: -108.69 },  // Redvale
  '81432': { lat: 38.16, lng: -107.76 },  // Ridgway
  '81433': { lat: 37.81, lng: -107.66 },  // Silverton
  '81434': { lat: 38.91, lng: -107.23 },  // Somerset
  '81435': { lat: 37.94, lng: -107.81 },  // Telluride

  // === Central Mountains / Buena Vista / Salida (812xx) ===
  '81201': { lat: 38.53, lng: -106.00 },  // Salida
  '81210': { lat: 38.53, lng: -106.59 },  // Almont
  '81211': { lat: 38.84, lng: -106.13 },  // Buena Vista
  '81212': { lat: 38.45, lng: -105.24 },  // Canon City
  '81215': { lat: 38.45, lng: -105.24 },  // Canon City
  '81220': { lat: 38.31, lng: -107.17 },  // Cimarron
  '81221': { lat: 38.38, lng: -105.10 },  // Coal Creek
  '81222': { lat: 38.33, lng: -105.57 },  // Cotopaxi
  '81223': { lat: 38.51, lng: -105.43 },  // Coaldale area
  '81224': { lat: 38.66, lng: -106.92 },  // Crested Butte
  '81225': { lat: 38.90, lng: -106.96 },  // Crested Butte (Ski Area)
  '81226': { lat: 38.50, lng: -105.37 },  // Cotopaxi
  '81227': { lat: 38.62, lng: -106.17 },  // Monarch
  '81230': { lat: 38.55, lng: -106.92 },  // Gunnison
  '81231': { lat: 38.55, lng: -106.92 },  // Gunnison
  '81232': { lat: 38.27, lng: -105.38 },  // Hillside
  '81233': { lat: 38.30, lng: -105.80 },  // Howard
  '81235': { lat: 37.99, lng: -107.32 },  // Lake City
  '81236': { lat: 38.72, lng: -106.35 },  // Nathrop
  '81237': { lat: 38.71, lng: -106.73 },  // Ohio City
  '81239': { lat: 38.53, lng: -106.58 },  // Parlin
  '81240': { lat: 38.44, lng: -105.16 },  // Penrose
  '81241': { lat: 38.76, lng: -106.63 },  // Pitkin
  '81242': { lat: 38.51, lng: -106.08 },  // Poncha Springs
  '81243': { lat: 38.24, lng: -107.35 },  // Powderhorn
  '81244': { lat: 38.45, lng: -105.00 },  // Rockvale
  '81248': { lat: 38.46, lng: -106.41 },  // Sargents
  '81251': { lat: 39.08, lng: -106.34 },  // Twin Lakes
  '81252': { lat: 38.25, lng: -105.53 },  // Westcliffe
  '81253': { lat: 38.16, lng: -105.61 },  // Wetmore

  // === NE Colorado / Sterling / Fort Morgan (807xx-808xx) ===
  '80701': { lat: 40.25, lng: -103.80 },  // Fort Morgan
  '80705': { lat: 40.25, lng: -103.80 },  // Fort Morgan
  '80720': { lat: 40.16, lng: -103.23 },  // Akron
  '80721': { lat: 40.83, lng: -102.37 },  // Amherst
  '80722': { lat: 40.70, lng: -103.21 },  // Atwood
  '80723': { lat: 40.17, lng: -103.22 },  // Brush
  '80726': { lat: 40.93, lng: -102.91 },  // Crook
  '80727': { lat: 39.73, lng: -102.51 },  // Eckley
  '80728': { lat: 40.62, lng: -102.63 },  // Fleming
  '80729': { lat: 40.82, lng: -104.23 },  // Grover
  '80731': { lat: 40.63, lng: -102.20 },  // Holyoke
  '80733': { lat: 40.57, lng: -103.03 },  // Iliff
  '80734': { lat: 40.88, lng: -102.17 },  // Julesburg
  '80735': { lat: 39.57, lng: -102.72 },  // Joes
  '80736': { lat: 40.89, lng: -103.10 },  // Merino
  '80737': { lat: 40.63, lng: -102.63 },  // Paoli
  '80740': { lat: 39.70, lng: -103.71 },  // Last Chance
  '80741': { lat: 40.37, lng: -103.37 },  // Log Lane Village
  '80742': { lat: 40.59, lng: -104.22 },  // New Raymer
  '80743': { lat: 40.15, lng: -102.98 },  // Otis
  '80744': { lat: 40.89, lng: -102.43 },  // Ovid
  '80745': { lat: 40.81, lng: -103.49 },  // Padroni
  '80746': { lat: 40.97, lng: -102.70 },  // Peetz
  '80747': { lat: 40.79, lng: -103.10 },  // Sedgwick
  '80749': { lat: 40.88, lng: -102.06 },  // Sedgwick area
  '80750': { lat: 40.50, lng: -103.53 },  // Snyder
  '80751': { lat: 40.62, lng: -103.21 },  // Sterling
  '80754': { lat: 40.53, lng: -103.78 },  // Stoneham
  '80755': { lat: 40.10, lng: -102.60 },  // Vernon
  '80757': { lat: 39.65, lng: -103.16 },  // Woodrow
  '80758': { lat: 40.06, lng: -102.21 },  // Wray
  '80759': { lat: 40.10, lng: -102.30 },  // Yuma

  // === South Metro / Elizabeth / Franktown ===
  '80106': { lat: 39.34, lng: -104.59 },  // Elizabeth
  '80107': { lat: 39.33, lng: -104.59 },  // Elizabeth
  '80116': { lat: 39.36, lng: -104.60 },  // Franktown
  '80117': { lat: 39.33, lng: -104.46 },  // Kiowa
  '80118': { lat: 39.28, lng: -104.93 },  // Larkspur

  // === Trinidad / Southern Border ===
  '81082': { lat: 37.17, lng: -104.50 },  // Trinidad
  '81024': { lat: 37.43, lng: -104.54 },  // Aguilar
  '81027': { lat: 37.41, lng: -104.10 },  // Branson / Kim area
  '81036': { lat: 38.21, lng: -103.15 },  // Eads
  '81038': { lat: 38.11, lng: -103.20 },  // Fort Lyon
  '81041': { lat: 37.99, lng: -102.28 },  // Granada
  '81043': { lat: 37.67, lng: -102.67 },  // Hartman area
  '81044': { lat: 37.74, lng: -102.95 },  // Hasty
  '81045': { lat: 38.44, lng: -103.30 },  // Haswell
  '81046': { lat: 37.36, lng: -104.20 },  // Hoehne
  '81047': { lat: 38.00, lng: -102.13 },  // Holly
  '81049': { lat: 37.29, lng: -103.76 },  // Kim
  '81054': { lat: 38.03, lng: -103.23 },  // Las Animas area
  '81057': { lat: 38.18, lng: -102.96 },  // McClave
  '81059': { lat: 37.32, lng: -104.63 },  // Model
  '81064': { lat: 37.12, lng: -103.51 },  // Pritchett
  '81071': { lat: 38.47, lng: -102.33 },  // Sheridan Lake
  '81073': { lat: 37.37, lng: -102.60 },  // Springfield
  '81076': { lat: 38.47, lng: -103.08 },  // Sugar City
  '81077': { lat: 38.01, lng: -103.22 },  // Swink
  '81081': { lat: 37.00, lng: -104.73 },  // Starkville (near Trinidad)
  '81084': { lat: 37.39, lng: -102.27 },  // Two Buttes
  '81087': { lat: 37.38, lng: -102.40 },  // Vilas
  '81090': { lat: 37.17, lng: -102.44 },  // Walsh
  '81092': { lat: 37.74, lng: -102.19 },  // Wiley
};
