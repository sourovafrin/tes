import path from 'path';
import fs from 'fs';
import steemconnect from 'sc2-sdk';
import { Client, PrivateKey } from 'dsteem';
import config from '../config';

// Taken from https://github.com/steemit/steem-js/blob/master/src/formatter.js

export function calcReputation(rawRep) {
  if (rawRep == null) return rawRep;
  const reputation = parseInt(rawRep, 10);
  let rep = String(reputation);
  const neg = rep.charAt(0) === '-';
  rep = neg ? rep.substring(1) : rep;
  const str = rep;
  const leadingDigits = parseInt(str.substring(0, 4), 10);
  const log = Math.log(leadingDigits) / Math.log(10);
  const n = str.length - 1;
  let out = n + (log - parseInt(log, 10));
  if (Number.isNaN(out)) out = 0;
  out = Math.max(out - 9, 0);
  out *= (neg ? -1 : 1);
  out = (out * 9) + 25;
  out = parseInt(out, 10);
  return out;
}

export function vestToSteem(vestingShares, totalVestingShares, totalVestingFundSteem) {
  return parseFloat(parseFloat(totalVestingFundSteem) *
    (parseFloat(vestingShares) / parseFloat(totalVestingShares))).toFixed(3);
}

export const getUnixTime = dateObj => dateObj.getTime() / 1000 | 0;

export function doComment(author, permlink) {
  const dsteem = new Client(config.NODE);
  let comment = null;

  if (config.COMMENT_LOCATION && config.COMMENT_LOCATION !== '') {
    comment = fs.readFileSync(path.join(config.PROJECT_ROOT, config.COMMENT_LOCATION), 'utf-8');
    comment = comment.replace(/\{STEEM_ACCOUNT\}/g, config.STEEM_ACCOUNT);
  } else {
    comment = 'You just got upvoted!';
  }

  if (comment && comment !== '') {
    const commentPermlink = `re-${author}-${permlink}-${new Date().toISOString().replace(/-|:|\./g, '').toLowerCase()}`;

    dsteem.broadcast.comment({
      author: config.STEEM_ACCOUNT,
      body: comment,
      json_metadata: '{}',
      parent_author: author,
      parent_permlink: permlink,
      permlink: commentPermlink,
      title: '',
    }, PrivateKey.from(config.POSTING_WIF));
  }
}
export const SC2 = steemconnect.Initialize({
  app: 'micro.app',
});
