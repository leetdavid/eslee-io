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
A full retrieval of the Sushiro store list and each store's queue data, performed at page load and every 60 seconds thereafter. Visitors can also trigger it manually.
_Avoid_: polling interval, background update

**Unavailable state**:
The retryable error state shown when queue data cannot be loaded. The application does not retain or display previously fetched data.
_Avoid_: stale data, offline cache

## Data

**Queue source**:
The two official Sushiro Hong Kong endpoints supplying store details and queue data. The app accesses them through its own server-side proxy route rather than from the browser.
_Avoid_: queue API, client API

**Queue band**:
The colour and label assigned from a store's waiting-group count: no queue (0), short (1-10), moderate (11-30), or long (31+). The count colour moves from green through yellow to red as urgency increases; names remain monochrome. A closed store or one not issuing tickets is always muted.
_Avoid_: wait time category, queue severity

**Basemap**:
A bundled, two-colour geographic silhouette of Hong Kong showing only land and sea. It has no streets, place labels, district boundaries, tiles, or map-provider controls.
_Avoid_: map tiles, street map

**Map view**:
The fixed, all-Hong-Kong basemap shown without pan or zoom controls. It fills the available viewport while preserving geographic aspect ratio, and its store labels scale responsively. Store markers are its only interactive elements.
_Avoid_: viewport, interactive map

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

**Store label**:
The always-visible map annotation for a store, showing its localized upstream name and waiting-group count. The complete label is the store's selection target; it has no hover, clustering, or collision-resolution behavior.
_Avoid_: marker tooltip, hover label

**English store name**:
The verified upstream `nameEn` value displayed for a store when English is selected. Cantonese uses the upstream `name` value.
_Avoid_: translated store name, manually maintained name

**Store location text**:
The upstream area and address values shown unchanged in both languages because Sushiro does not supply English equivalents.
_Avoid_: localized address, translated district
