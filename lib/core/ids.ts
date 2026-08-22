/**
 * Identifier aliases. These are plain `string` on purpose: DESIGN.md §2.2 and §4.2 write
 * them that way, and branding them would force casts at every authoring site in a device
 * folder — the one place the design says must stay easy to write.
 */

export type DeviceId = string
export type VoiceId = string
export type PoolId = string
export type RecipeId = string
export type TemplateId = string
export type RequestId = string
export type PatternId = string
export type HookId = string
export type InspirationId = string

/** Section names are authored per template and are the key of `Occupancy`'s inner map (§4.2). */
export type SectionName = string
