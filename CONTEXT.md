# Sushiro Queue Map

This context describes the public queue-status viewer for Sushiro stores in Hong Kong.

## Language

**Default language**:
The language presented when a visitor first opens the queue map: Cantonese written in Traditional Chinese. English is an optional visitor-selected alternative.
_Avoid_: primary language, fallback language

## Map

**Queue marker**:
A colour-coded map marker representing one Sushiro store and its current queue size. Selecting it opens that store's detail sheet.
_Avoid_: pin, store dot

**Store detail sheet**:
A fixed bottom sheet containing the selected store's API-backed queue statistics: name, area, address, store status, ticketing status, waiting groups, and called ticket numbers.
_Avoid_: card, popup

**Waiting groups**:
The upstream `wait` value: the number of groups currently waiting at a store. It is not a duration estimate.
_Avoid_: wait time, minutes waiting

**Called ticket numbers**:
The upstream `storeQueue` values: ticket numbers currently being called at a store. The detail sheet shows them as a compact comma-separated row, or an em dash when none are supplied.
_Avoid_: queue number, ticket queue

**Seating breakdown**:
The selected store's table in the detail sheet, showing the upstream `waitingGroupTable`, `waitingGroupCounter`, and `waitingGroupPair` counts. It is not displayed on the map.
_Avoid_: map queue categories, wait-time detail

**Refresh cycle**:
A full retrieval of the Sushiro store list and each store's queue data at most once every 60 seconds. Page load, automatic refresh, and manual refresh all receive the same current snapshot during a cycle.
_Avoid_: polling interval, background update

**Unavailable state**:
The retryable error state shown when queue data cannot be loaded. The application does not retain or display previously fetched data.
_Avoid_: stale data, offline cache

## Data

**Queue source**:
The two official Sushiro Hong Kong endpoints supplying store details and queue data. The app accesses them through its own server-side proxy route rather than from the browser.
_Avoid_: queue API, client API

**Queue snapshot**:
A time-stamped complete record of the queue data for every store, captured every five minutes for the Grid chart window.
_Avoid_: chart cache, database row

**Queue band**:
The colour and label assigned from a store's waiting-group count: no queue (0), short (1-10), moderate (11-30), or long (31+). The count colour moves from green through yellow to red as urgency increases; names remain monochrome. A closed store or one not issuing tickets is always muted.
_Avoid_: wait time category, queue severity

**Basemap**:
A bundled, two-colour geographic silhouette of Hong Kong showing only land and sea. It has no streets, place labels, district boundaries, tiles, or map-provider controls.
_Avoid_: map tiles, street map

**Map view**:
The fixed, all-Hong-Kong basemap shown without pan or zoom controls. It fills the available viewport while preserving geographic aspect ratio, and its store labels scale responsively. Store markers are its only interactive elements.
_Avoid_: viewport, interactive map

**Grid home**:
The default Home view: a curated geographic grid of Sushiro locations. It is distinct from, and does not simplify, the Map view.
_Avoid_: table view, store list

**Grid queue card**:
A selectable grid-home representation of one store that shows its localized name, current waiting groups, called ticket numbers, and a comparable queue trend. Selecting it opens the store detail sheet.
_Avoid_: marker, popup card

**Grid chart window**:
The trailing 12-hour period plotted behind every grid queue card. It incorporates each newly captured Queue snapshot on its next request. All cards use a shared zero-based vertical scale, based on the largest plotted waiting-group count, so their area charts can be compared accurately.
_Avoid_: per-card scale, relative chart

**Grid language**:
Grid Home follows the app-wide visitor language selection: Cantonese in Traditional Chinese by default, with English as the alternative. The curated grid determines a store's position only; it does not determine its display name.
_Avoid_: English-only grid, translated store name

**Inactive grid card**:
A grid queue card for a closed store or a store not issuing tickets. It remains in its geographic cell with the muted treatment, even when the upstream source reports a nonzero waiting-group count.
_Avoid_: colour by inactive wait, hidden inactive store

**Mobile grid**:
The complete six-column geographic grid scaled to fit the phone viewport. Its locations are never reordered or replaced by a list at narrow widths.
_Avoid_: mobile list, reflowed geography

**Grid history-loading state**:
The temporary chart state after current store data loads and before 12-hour history is available. Cards show their current operational information and remain selectable while the background chart is absent.
_Avoid_: blocked grid, cached chart

**Empty grid chart**:
The intentionally blank trend area on a grid queue card with no 12-hour snapshots. It contains no explanatory copy so the current queue information remains the visual priority.
_Avoid_: no-history label, chart error

**App navigation**:
The compact persistent strip that links to Grid Home and Map, contains an unavailable Stats item with a translated “Coming soon” tooltip, and provides the shared language switcher and manual refresh action.
_Avoid_: map-only controls, active Stats page

**Grid home header**:
The Grid Home top area, containing only app navigation and its shared controls. It deliberately does not repeat the Map view's network total or active-store count.
_Avoid_: grid telemetry, home summary

**Grid queue colour**:
The pale full-card surface tint assigned from a grid queue card's queue band. It uses the established green through red urgency scale while preserving high-contrast black content and chart marks.
_Avoid_: saturated card, colour-only information

**Grid called tickets**:
The upstream called ticket numbers shown at the bottom of a grid queue card. The seating breakdown remains available only in the store detail sheet.
_Avoid_: card seating breakdown, queue-category values

**Network total**:
The sum of waiting groups at stores that are both open and issuing tickets, accompanied by their count. It is shown in the header as an at-a-glance Hong Kong queue summary.
_Avoid_: total wait time, all-store total

**Telemetry stack**:
The floating top-left map overlay showing the product label, network total, and active-store count. It replaces a conventional page header.
_Avoid_: header, navigation bar

**Language toggle**:
The compact floating control that switches the interface between Cantonese and English and remembers the visitor's selection.
_Avoid_: locale menu, language settings

## Presentation

**Visual system**:
An extremely minimal, Vercel-inspired interface using high-contrast black and white for the basemap and chrome, flat surfaces, fine borders, compact system typography, and no decorative effects. Queue counts alone use the semantic urgency scale.
_Avoid_: branded Sushiro styling, decorative interface

**Attribution**:
The compact statement that this is an unofficial viewer using Sushiro Hong Kong data, shown in the store detail sheet.
_Avoid_: endorsement, affiliation

## Boundaries

**Sushiro app**:
The independent Next.js application at `apps/sushiro` deployed to `sushiro.eslee.io`. It owns the map, the Sushiro proxy route, and no shared product state.
_Avoid_: www feature, CMS page

**Initial map state**:
The state after a successful first load: telemetry and all store markers are visible, but no store detail sheet is open.
_Avoid_: default selection, selected store

**Unplaced section**:
A clearly labelled non-geographic section on the grid home that contains a live store not yet represented in the curated geographic grid. It keeps every current store visible while signalling that the grid layout needs maintenance.
_Avoid_: hidden store, auto-placed location

**Store label**:
The always-visible map annotation for a store, showing its localized upstream name and waiting-group count. The complete label is the store's selection target; it has no hover, clustering, or collision-resolution behavior.
_Avoid_: marker tooltip, hover label

**English store name**:
The verified upstream `nameEn` value displayed for a store when English is selected. Cantonese uses the upstream `name` value.
_Avoid_: translated store name, manually maintained name

**Store location text**:
The upstream area and address values shown unchanged in both languages because Sushiro does not supply English equivalents.
_Avoid_: localized address, translated district
