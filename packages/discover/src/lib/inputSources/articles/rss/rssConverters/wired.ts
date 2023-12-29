import { OmnivoreArticle } from '../../../../../types/OmnivoreArticle'
import { slugify } from 'voca'
import { XMLParser } from 'fast-xml-parser'
import { fromArrayLike } from 'rxjs/internal/observable/innerFrom'
import { Observable } from 'rxjs'
import { mapOrNull } from '../../../../utils/reactive'
import { filter } from 'rxjs/operators'

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true })
export const convertWiredArticles = (
  articleXml: string,
): Observable<OmnivoreArticle> => {
  return fromArrayLike(parser.parse(articleXml).rss.channel.item).pipe(
    filter((article: any) => article.description?.length > 0),
    mapOrNull((article: any) => ({
      authors: article['dc:creator'],
      slug: slugify(article.link),
      url: article.link,
      title: article.title,
      description: article.description,
      summary: article.description,
      image: article['media:thumbnail']['@_url'],
      site: new URL(article.link).host,
      publishedAt: new Date(article.pubDate),
      type: 'rss',
    })),
  )
}