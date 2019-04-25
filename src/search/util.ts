import Storex from '@worldbrain/storex'

import { GetPksPlugin } from './plugins/get-pks'
import { DBGet } from './types'
import { Page } from './models'
import normalizeUrl from '../util/encode-url-for-id'
import { initErrHandler } from './storage'

export const DEFAULT_TERM_SEPARATOR = /[|\u{A0}' .,|(\n)]+/u
export const URL_SEPARATOR = /[/?#=+& _.,\-|(\n)]+/

export const collections = (db: Storex) => Object.keys(db.registry.collections)

export const getPage = (getDb: DBGet) => async (url: string) => {
    const db = await getDb()
    const page = await db
        .collection('pages')
        .findOneObject<Page>({ url: normalizeUrl(url) })
        .catch(initErrHandler())

    if (page != null) {
        // Force-load any related records from other tables
        await new Page(db, page).loadRels()
    }

    return page
}

/**
 * Hardcoded replacement for now.
 *
 * TODO: Maybe overhaul `import-item-creation` module to not need this (only caller)
 */
export const grabExistingKeys = (getDb: DBGet) => async () => {
    const db = await getDb()
    let histKeys: Set<string>
    let bmKeys: Set<string>

    try {
        histKeys = new Set(await db.operation(GetPksPlugin.GET_PKS_OP, 'pages'))
        bmKeys = new Set(
            await db.operation(GetPksPlugin.GET_PKS_OP, 'bookmarks'),
        )
    } catch (err) {
        initErrHandler({ histKeys: new Set(), bmKeys: new Set() })(err)
    }

    return { histKeys, bmKeys }
}

/**
 * Handles splitting up searchable content into indexable terms. Terms are all
 * lowercased.
 *
 * @param {string} content Searchable content text.
 * @param {string|RegExp} [separator=' '] Separator used to split content into terms.
 * @returns {string[]} Array of terms derived from `content`.
 */
export const extractContent = (
    content,
    { separator = DEFAULT_TERM_SEPARATOR },
) =>
    content
        .split(separator)
        .map(word => word.toLowerCase())
        .filter(term => term.length)
