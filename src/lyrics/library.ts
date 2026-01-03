/**
 * Songs Library
 *
 * Central registry of all available test songs.
 * Static class providing access to songs as a collection.
 *
 * Usage:
 * ------
 * import { SongsLibrary } from '@/lyrics/library'
 *
 * // Get all songs
 * const allSongs = SongsLibrary.all()
 *
 * // Get specific song
 * const song = SongsLibrary.get('meet-me-in-november')
 *
 * // Iterate over all songs for batch testing
 * for (const song of SongsLibrary.all()) {
 *   console.log(`Testing ${song.title}...`)
 * }
 */

import type { Song                            } from './types'
import { MeetMeInNovember                     } from './meet-me-in-november'
import { happyBirthday                        } from './happy-birthday'
import { rowRowRowYourBoat                    } from './row-row-row-your-boat'
import { twinkleTwinkleLittleStar             } from './twinkle-twinkle-little-star'
import { amazingGrace                         } from './amazing-grace'
import { swingLowSweetChariot                 } from './swing-low-sweet-chariot'
import { oComeAllYeFaithful                   } from './o-come-all-ye-faithful'
import { auldLangSyne                         } from './auld-lang-syne'
import { simpleGifts                          } from './simple-gifts'
import { myBonnieLiesOverTheOcean             } from './my-bonnie-lies-over-the-ocean'
import { homeOnTheRange                       } from './home-on-the-range'
import { iveBeenWorkingOnTheRailroad          } from './ive-been-working-on-the-railroad'
import { ohSusanna                            } from './oh-susanna'
import { homeSweetHome                        } from './home-sweet-home'
import { buffaloGals                          } from './buffalo-gals'
import { justACloserWalkWithThee              } from './just-a-closer-walk-with-thee'
import { wadeInTheWater                       } from './wade-in-the-water'
import { goDownMoses                          } from './go-down-moses'
import { stealAway                            } from './steal-away'
import { followTheDrinkingGourd               } from './follow-the-drinking-gourd'
import { wereYouThere                         } from './were-you-there'
import { shallWeGatherAtTheRiver              } from './shall-we-gather-at-the-river'
import { whatAFriendWeHaveInJesus             } from './what-a-friend-we-have-in-jesus'
import { rockOfAges                           } from './rock-of-ages'
import { jesusLovesMe                         } from './jesus-loves-me'
import { brahmsLullaby                        } from './brahms-lullaby'
import { maryHadALittleLamb                   } from './mary-had-a-little-lamb'
import { baaBaaBlackSheep                     } from './baa-baa-black-sheep'
import { londonBridge                         } from './london-bridge'
import { ringAroundTheRosie                   } from './ring-around-the-rosie'
import { shooFlyDontBotherMe                  } from './shoo-fly-dont-bother-me'
import { skipToMyLou                          } from './skip-to-my-lou'
import { arkansasTraveler                     } from './arkansas-traveler'
import { turkeyInTheStraw                     } from './turkey-in-the-straw'
import { goldenSlippers                       } from './golden-slippers'
import { listenToTheMockingBird               } from './listen-to-the-mocking-bird'
import { lovesOldSweetSong                    } from './loves-old-sweet-song'
import { beautifulDreamer                     } from './beautiful-dreamer'
import { ohMyDarlingClementine                } from './oh-my-darling-clementine'
import { sweetBetsyFromPike                   } from './sweet-betsy-from-pike'
import { redRiverValley                       } from './red-river-valley'
import { hardTimesCoameAgainNoMore            } from './hard-times-come-again-no-more'
import { tentingOnTheOldCampGround            } from './tenting-on-the-old-camp-ground'
import { inTheGoodOldSummertime               } from './in-the-good-old-summertime'

/**
 * Songs Library - Static class for managing test songs
 */
export class SongsLibrary
{
  /**
   * Complete registry of all test songs
   * Key format: kebab-case song name
   */
  private static readonly REGISTRY: Record<string, Song> = {
    'meet-me-in-november': MeetMeInNovember,
    'happy-birthday': happyBirthday,
    'row-row-row-your-boat': rowRowRowYourBoat,
    'twinkle-twinkle-little-star': twinkleTwinkleLittleStar,
    'amazing-grace': amazingGrace,
    'swing-low-sweet-chariot': swingLowSweetChariot,
    'o-come-all-ye-faithful': oComeAllYeFaithful,
    'auld-lang-syne': auldLangSyne,
    'simple-gifts': simpleGifts,
    'my-bonnie-lies-over-the-ocean': myBonnieLiesOverTheOcean,
    'home-on-the-range': homeOnTheRange,
    'ive-been-working-on-the-railroad': iveBeenWorkingOnTheRailroad,
    'oh-susanna': ohSusanna,
    'home-sweet-home': homeSweetHome,
    'buffalo-gals': buffaloGals,
    'just-a-closer-walk-with-thee': justACloserWalkWithThee,
    'wade-in-the-water': wadeInTheWater,
    'go-down-moses': goDownMoses,
    'steal-away': stealAway,
    'follow-the-drinking-gourd': followTheDrinkingGourd,
    'were-you-there': wereYouThere,
    'shall-we-gather-at-the-river': shallWeGatherAtTheRiver,
    'what-a-friend-we-have-in-jesus': whatAFriendWeHaveInJesus,
    'rock-of-ages': rockOfAges,
    'jesus-loves-me': jesusLovesMe,
    'brahms-lullaby': brahmsLullaby,
    'mary-had-a-little-lamb': maryHadALittleLamb,
    'baa-baa-black-sheep': baaBaaBlackSheep,
    'london-bridge': londonBridge,
    'ring-around-the-rosie': ringAroundTheRosie,
    'shoo-fly-dont-bother-me': shooFlyDontBotherMe,
    'skip-to-my-lou': skipToMyLou,
    'arkansas-traveler': arkansasTraveler,
    'turkey-in-the-straw': turkeyInTheStraw,
    'golden-slippers': goldenSlippers,
    'listen-to-the-mocking-bird': listenToTheMockingBird,
    'loves-old-sweet-song': lovesOldSweetSong,
    'beautiful-dreamer': beautifulDreamer,
    'oh-my-darling-clementine': ohMyDarlingClementine,
    'sweet-betsy-from-pike': sweetBetsyFromPike,
    'red-river-valley': redRiverValley,
    'hard-times-come-again-no-more': hardTimesCoameAgainNoMore,
    'tenting-on-the-old-camp-ground': tentingOnTheOldCampGround,
    'in-the-good-old-summertime': inTheGoodOldSummertime
  }

  /**
   * Get all songs as an array
   */
  static all(): Song[]
  {
    return Object.values(this.REGISTRY)
  }

  /**
   * Get song by kebab-case key
   */
  static get(key: string): Song | undefined
  {
    return this.REGISTRY[key]
  }

  /**
   * Get song count
   */
  static count(): number
  {
    return Object.keys(this.REGISTRY).length
  }

  /**
   * Get all song titles
   */
  static titles(): string[]
  {
    return this.all().map(song => song.title)
  }

  /**
   * Get all song artists
   */
  static artists(): string[]
  {
    return this.all().map(song => song.artist)
  }

  /**
   * Get registry as record (for backward compatibility)
   */
  static asRecord(): Record<string, Song>
  {
    return { ...this.REGISTRY }
  }
}

// Backward compatibility: export SONGS_LIBRARY as alias
export const SONGS_LIBRARY: Record<string, Song> = SongsLibrary.asRecord()

// VIM: set ts=2 sw=2 et:
// END
