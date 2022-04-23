const axios = require('axios').default;
import GithubSlugger from 'github-slugger'

import { getTweetContent } from './getTweetContent';
import parseTweetHtml from './parseTweetHtml';
import htmlToAst from './parsers/htmlToAst';


class Context {
  slugger = new GithubSlugger()
  map = []
  get(id) {
    return this.map[Number(id)]
  }
  add(data, nodes) {
    return this.map.push({ data, nodes }) - 1
  }
}


const fetchTweetHTML = async (tweetId) => {
  const res = await axios.get(`https://syndication.twitter.com/tweets.json?ids=${tweetId}`)

  if (res.status === 200) return res.data[tweetId]
  if (res.status === 404) return {}

  throw new Error(`Fetch for the embedded tweet of id: "${tweetId}" failed with code: ${res.status}`)
}

export default async function fetchTweetAst (tweetId) {
  const tweetHtml = await fetchTweetHTML(tweetId)
  const tweetData =  getTweetContent(tweetHtml)

  if (!tweetData) throw new Error("Something went wrong")

  const context = new Context()
  const html = await parseTweetHtml(tweetData, context)
  const ast = await htmlToAst(html, context)

  return ast
}