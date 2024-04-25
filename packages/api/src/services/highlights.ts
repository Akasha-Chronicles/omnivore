import DataLoader from 'dataloader'
import { diff_match_patch } from 'diff-match-patch'
import { DeepPartial, In } from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { EntityLabel } from '../entity/entity_label'
import { Highlight } from '../entity/highlight'
import { Label } from '../entity/label'
import { LibraryItem } from '../entity/library_item'
import { homePageURL } from '../env'
import { createPubSubClient, EntityEvent, EntityType } from '../pubsub'
import { authTrx } from '../repository'
import { highlightRepository } from '../repository/highlight'
import { Merge } from '../util'
import { enqueueUpdateHighlight } from '../utils/createTask'
import { deepDelete } from '../utils/helpers'
import { ItemEvent } from './library_item'

const columnsToDelete = ['user', 'sharedAt', 'libraryItem'] as const
type ColumnsToDeleteType = typeof columnsToDelete[number]
export type HighlightEvent = Merge<
  Omit<DeepPartial<Highlight>, ColumnsToDeleteType>,
  EntityEvent
>

const batchGetHighlightsFromLibraryItemIds = async (
  libraryItemIds: readonly string[]
): Promise<Highlight[][]> => {
  const libraryItems = await authTrx(async (tx) =>
    tx.getRepository(LibraryItem).find({
      where: { id: In(libraryItemIds as string[]) },
      relations: {
        highlights: {
          user: true,
        },
      },
    })
  )

  return libraryItemIds.map(
    (libraryItemId) =>
      libraryItems.find((libraryItem) => libraryItem.id === libraryItemId)
        ?.highlights || []
  )
}

export const highlightsLoader = new DataLoader(
  batchGetHighlightsFromLibraryItemIds
)

export const getHighlightLocation = (patch: string): number | undefined => {
  const dmp = new diff_match_patch()
  const patches = dmp.patch_fromText(patch)
  return patches[0].start1 || undefined
}

export const getHighlightUrl = (slug: string, highlightId: string): string =>
  `${homePageURL()}/me/${slug}#${highlightId}`

export const createHighlights = async (
  highlights: DeepPartial<Highlight>[],
  userId: string
) => {
  return authTrx(
    async (tx) =>
      tx.withRepository(highlightRepository).createAndSaves(highlights),
    undefined,
    userId
  )
}

export const createHighlight = async (
  highlight: DeepPartial<Highlight>,
  libraryItemId: string,
  userId: string,
  pubsub = createPubSubClient()
) => {
  const newHighlight = await authTrx(
    async (tx) => {
      const repo = tx.withRepository(highlightRepository)
      const newHighlight = await repo.createAndSave(highlight)
      return repo.findOneOrFail({
        where: { id: newHighlight.id },
        relations: {
          user: true,
          libraryItem: true,
        },
      })
    },
    undefined,
    userId
  )

  const data = deepDelete(newHighlight, columnsToDelete)
  await pubsub.entityCreated<ItemEvent>(
    EntityType.HIGHLIGHT,
    {
      id: libraryItemId,
      highlights: [data],
      // for Readwise
      originalUrl: newHighlight.libraryItem.originalUrl,
      title: newHighlight.libraryItem.title,
      author: newHighlight.libraryItem.author,
      thumbnail: newHighlight.libraryItem.thumbnail,
    },
    userId
  )

  await enqueueUpdateHighlight({
    libraryItemId,
    userId,
  })

  return newHighlight
}

export const mergeHighlights = async (
  highlightsToRemove: string[],
  highlightToAdd: DeepPartial<Highlight>,
  labels: Label[],
  libraryItemId: string,
  userId: string,
  pubsub = createPubSubClient()
) => {
  const newHighlight = await authTrx(async (tx) => {
    const highlightRepo = tx.withRepository(highlightRepository)

    await highlightRepo.delete(highlightsToRemove)

    const newHighlight = await highlightRepo.createAndSave(highlightToAdd)

    if (labels.length > 0) {
      // save new labels
      await tx.getRepository(EntityLabel).save(
        labels.map((l) => ({
          labelId: l.id,
          highlightId: newHighlight.id,
        }))
      )
    }

    return highlightRepo.findOneOrFail({
      where: { id: newHighlight.id },
      relations: {
        user: true,
        libraryItem: true,
      },
    })
  })

  await pubsub.entityCreated<ItemEvent>(
    EntityType.HIGHLIGHT,
    {
      id: libraryItemId,
      originalUrl: newHighlight.libraryItem.originalUrl,
      title: newHighlight.libraryItem.title,
      author: newHighlight.libraryItem.author,
      thumbnail: newHighlight.libraryItem.thumbnail,
      highlights: [newHighlight],
    },
    userId
  )

  await enqueueUpdateHighlight({
    libraryItemId,
    userId,
  })

  return newHighlight
}

export const updateHighlight = async (
  highlightId: string,
  highlight: QueryDeepPartialEntity<Highlight>,
  userId: string,
  pubsub = createPubSubClient()
) => {
  const updatedHighlight = await authTrx(async (tx) => {
    const highlightRepo = tx.withRepository(highlightRepository)
    await highlightRepo.updateAndSave(highlightId, highlight)

    return highlightRepo.findOneOrFail({
      where: { id: highlightId },
      relations: {
        libraryItem: true,
        user: true,
      },
    })
  })

  const libraryItemId = updatedHighlight.libraryItem.id
  await pubsub.entityUpdated<ItemEvent>(
    EntityType.HIGHLIGHT,
    {
      id: libraryItemId,
      originalUrl: updatedHighlight.libraryItem.originalUrl,
      title: updatedHighlight.libraryItem.title,
      author: updatedHighlight.libraryItem.author,
      thumbnail: updatedHighlight.libraryItem.thumbnail,
      highlights: [
        {
          ...highlight,
          id: highlightId,
          updatedAt: new Date(),
          quote: updatedHighlight.quote,
          highlightType: updatedHighlight.highlightType,
        },
      ],
    } as ItemEvent,
    userId
  )

  await enqueueUpdateHighlight({
    libraryItemId,
    userId,
  })

  return updatedHighlight
}

export const deleteHighlightById = async (highlightId: string) => {
  const deletedHighlight = await authTrx(async (tx) => {
    const highlightRepo = tx.withRepository(highlightRepository)
    const highlight = await highlightRepo.findOneOrFail({
      where: { id: highlightId },
      relations: {
        user: true,
      },
    })

    await highlightRepo.delete(highlightId)
    return highlight
  })

  await enqueueUpdateHighlight({
    libraryItemId: deletedHighlight.libraryItemId,
    userId: deletedHighlight.user.id,
  })

  return deletedHighlight
}

export const findHighlightById = async (
  highlightId: string,
  userId: string
) => {
  return authTrx(
    async (tx) => {
      const highlightRepo = tx.withRepository(highlightRepository)
      return highlightRepo.findOneBy({
        id: highlightId,
      })
    },
    undefined,
    userId
  )
}

export const findHighlightsByLibraryItemId = async (
  libraryItemId: string,
  userId: string
) => {
  return authTrx(
    async (tx) =>
      tx.withRepository(highlightRepository).find({
        where: { libraryItem: { id: libraryItemId } },
        relations: {
          user: true,
          labels: true,
        },
      }),
    undefined,
    userId
  )
}
