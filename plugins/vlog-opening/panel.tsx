// @name Vlog Opening
// @icon sparkles
// Builds a 12-22s vlog opening as a new Draft, in one of three styles, from the
// analysed footage of whatever Project is open. Shot choice is deterministic:
// the same Project with the same settings produces the same cut every time.

import React from "react";

// Illustrative preview tiles for the style picker: drawn, not filmed, and
// embedded so the picker needs no file access.
const PREVIEWS: Record<string, string> = {
  whip: "data:image/jpeg;base64,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",
  motion: "data:image/jpeg;base64,/9j//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgKCgsKCw0NDQ0NDRAPEBAQEBAQEBAQEBASEhIVFRUSEhIQEBISFBQVFRcXFxUVFRUXFxkZGR4eHBwjIyQrKzP/xAClAAEAAgIDAQAAAAAAAAAAAAAAAQgEBgIFBwMBAQEBAQEBAQAAAAAAAAAAAAABAgMEBQYQAAEBBAQHCwkHAwQCAwEAAAABBAMFAhESFtJUk7OUMVEGcaITYVU1clPRFSF0c1KxNkE0spGSFCKBMwcyI4JiQuEloWODJEPB8REBAAIBAwMEAwADAQEAAAAAAAERAmEDEiFRMUEyIoFxEyMEkTMFQv/AABEIAOYBkAMBIgACEQADEQD/2gAMAwEAAhEDEQA/APFJZVmVJZUWZVWhETxVVX3InvU7DuuJYA25u9uiF85sHlTPlJS6iqtK+JtlSvuuJYA25u9ujuuJYA25u9ul1KV1ildZBSvuuJYA25u9ujuuJYA25u9ul1KV1ildYFK+64lgDbm726O64lgDbm726XUpXWKV1gUr7riWANubvbo7riWANubvbpdSldYpXWBSvuuJYA25u9ujuuJYA25u9ul1KV1ildYFK+64lgDbm726O64lgDbm726XUpXWKV1gUr7riWANubvbpPdcSwBtzd7dLp0qKVApZ3XEsAbc3e3SO64lgDbm726XUpUUqBSvuuJYA25u9ujuuJYA25u9ul06VFKgUs7riWANubvbo7riWANubvbpdOlRSoFLO64lgDbm726O64lgDbm726XTpUUqBSzuuJYA25u9ujuuJYA25u9ul06VFKgUq7riWANubvbo7riWANubvbpdWldZFK6wKV91xLAG3N3t0d1xLAG3N3t0upSusUrrApX3XEsAbc3e3R3XEsAbc3e3S6lK6xSusClfdcSwBtzd7dHdcSwBtzd7dLqUrrFK6wKV91xLAG3N3t05d1xLAG3N3t0ulSusVlApb3XEsAbc3e3R3XEsAbc3e3S6VZRWUClndcSwBtzd7dHdcSwBtzd7dLp0rrFK6wKWd1xLAG3N3t0d1xLAG3N3t0unSusUrrApZ3XEsAbc3e3R3XEsAbc3e3S6dK6xSusClndkSwBtzd7dHdkSwBtzd7dLpVlFZQKW92RLAG3N3t0d2RLAG3N3t0ulWUVlApb3XEsAbc3e3TDeunridXb13O6nTTJPKskyU6KUmRF8S7yqutSrW33tM2ebZ8mgGpwvnJg8qZ8pKXUXSUrhfOTB5Uz5SUuoukCAAAAJAgEgEIBIFwqAAEAAAIJIAAAAAAAAAAEASCAAAAAAAAAABAAkgAAAAAAAAAAAQBIOIA5A4gDkVa2+9pmzoM+TQtGVc2+9pmzoM+TQDVIXzkweVM+UlLqLpKVwvnJg8qZ8pKXUXSBAAAx2h9KzOZ3s2iVPqvuQ8/fRdtezLNK8V0nulk8ENujXN77dk+Y85OOczEu2ERMOx7zb8Je/VOwd5t+EvfqnYdaDNz3deMdnZd5t+EvfqnYO82/CXv1TsOtBm5Tjj2bAyRlqdzyo9n4WRVRFraU40PQEVJkRU8UXxQ8fPWWb4dz5uT1IdsJtxzimQAavtFHHUCZUeUcI9eLQ6d619JV9FPeblzbQQV3n22j80yrK0OpEXxROBkWjipVDhbXaHCneId9hL0VYsFdLa7Q4U7xDvsFtNocKd4h32C9JKWLBXS2m0OFO8Q77BbTaHCneId9gvSSqWKBXW2m0OFOsQ77BbTaHCnWId9gvSRYoFdbabQ4U6xDvsJtptDhTrEO+wXpIsSCu1tNocKdYh32C2m0OFOsQ77BekixIK7W02hwp1iHfYLabQ4U6xDvsF6SLEgrtbTaHCnWId9gtptDhTrEO+wXpIsSCu1tNocKdYh32C2m0OFOsQ77BekixAK7W02hwp1iHfYLabQ4U6xDvsF6SLEgrtbTaDCXeIdi2sfwl2v8A6HZb0FiQaBsztQsZWZnfyo7fyJSipoeJxcetDfQjkDiCjkD5zTJLKsyrQie815/F1RVRzL/cvYa4o2Ug03vVq9JF4qqIdyyxSR6tV4iSTL4Jq/8A6OKO4ABloAAAq5t97TNnQZ8mhaMq5t97TNnQZ8mgGqwvnJg8qZ8pKXTXSUshfOTB5Uz5SUumukDiAAOljXN77dd/Mecno0a5vfbrv5jzk4Z+53w9v2AAw6gAIIU9ZZv0HPm5PlQ8mU9ZZv0HPm5PlQ74OO54hknin7i0/eYelPhwT3w/vQ9pPFv3E+Jh/mnvzoay8OUeXliJSTVU+rtPA+tB9Paxj9eNw82c/KerFqqKqmVQKDrwx7OfLWWNQooUyqBQOGPZb1liVVFVTKoFA4Y9i9ZYtVSaFMmgmgcMexessWhRQplUCgcMexessWhRQpk1RVHDHsXrLGoUUKZNUVRwx7Fz3ljUKKFO3cQ5sakpcM718muWU+T5kfsy1X7p46m1TJQZjhM1FL8tXW0KKFMmgUGuOMeiXPeWNQpCoZVBxmT8KnLcxjjPSujeGXVtOxfP7Knj4yP/AJFLDld9i/aBk6D/ACaliVPmw9CAAX1Rq8VaJuE4KXwRPFd3UdAZ8Q+Le9IwD0wyHI4nIsjcIc/V85oXxmk8F401naGtwelJny+6iX1myHmny0kgEEVJV3b32mbOgz5NC0BV7b32mbPNs+TQDVoXzkweVM+UlLprpKVwvnJg8qZ8pKXTXSBAAA6WNc3vt138x5yejxiWaZgeoiU+Mn/SnnBwz9zvh7QAGHUAAEKess36DnzcnyoeT0Kvgh6wzoqOHXFJIn50HTBxz8PueLfuL8TD/NPfnQ9pPFv3F+Jh/mnvzodMvDjHl5w4/h+Zk0HyZUpdrumZUPs7UfzxeTP3S+FBCoZFQmqdac2LQKDKqiqKVi0E0GTVFUUjGoIoUyqoqihi1VFVTLqiqKGJV4hV4jLqiqKGJVNmgELliTX/AFfB07StN/kvonR1T0fY9JEdtlP8q7uj7J4f83PLb2JnGa6xDtsxyz+m8u3cjqVJZJUkRPBETQiHwamRw2upnT+SWeWbWnii60XWZgPzkTOPWJnu+nxjs8DiTAsPa3jlfFJVVZV1p7lOsqm77V1ViMqS+5zLTu0qajUP1e18tvHKfMxE/wC3yMumUx+WPVODxP6c24ZlU+L6X+lPuDdj4ZNYe6Hc7Ge0LL0H+TLFFdNjF/59l6D/ACZYk+PD2T5cjiSQaRrkVZlpR9KlKUUTcXGa8ehKiKioqUoulFOifwqWZaXK1f8AFdH1O8ZREMtaCUqqIiU+J3HdTR6Tv6/7HaM0PkcLWmWvP7l9yfkJzR9GBwrhylP8pvFew7I4knGerSSDjSRSUclKwbe+0rX5tnyaFnaSsO3ntK2ebZ8mhlWrQvnJg8qZ8pKXTXSUrhfOTB5Uz5SUuoukCAABwnkSeVZVSlJkoVOI1N9s+izUunySS6pkVfUbeQZq2rppVnnvXu/szCzz3r3f2ZjdAThjqvPJpdnnvXu/szCzz3r3f2ZjdAOEHPJrDJA3bqdJ3s/CKniiIion/ZtBxJNUxcyHi37ifEw/zT350PaTxb9xPiYf5p786CfH+lhojClLpekpn1U1GLDkpczdNTs6in3NmP54vBn7pY1VNQqmTUUVTtTmx6oqmTUFQcVtjVRVMmoKg4lsaqKpk1BVHEY1UVTJqiqOIxqoqmTVFUcS2NVO8g7esNaK01Ku5/wzonu404zrKoqqc9zZx3cJxyi4axz4zcPbnL50/kSZ1Ok6L4+C0/XUYza2OWJ0rx5MnholpSsq7h4/JO+dJ/TeTu+jMqeo4zzPHnjPPNOuuZVX1nycf/MrOJnO8e1dXrn/ACpnHpFT6pbmiduaZ30yUVl8E1JqQwahk1VFVT7MYREPFMsaofBolocz7h2FVTGakX7u96Jy34/nk1h7oZOxnP7L0H+TLEFd9jOf2Xov8mWHPhw98pFJxU4lHM4qQCokEHEDkRScSAqQQAiSsW3ftI1+bZ8mhZsrHt17SNfQcZNCjVoXzmweVM+UlLqLpUpXC+c2DypnykpdRdKmVQAAAAAAgASQAAAAEni37ifEw/zT350PaTxb9xfiYf5p786EnxKw06Fp/Qm6anbUGBB5azNN5xfUh3XBn3tj/lj+Hz8/dLEoFUy+DHBno6ObEoFBl8GODCWxKBQZfBjgwrEoFUy+DHBj7S2JVQVUMvgxwY+1tiVUFVDL4McGPstiVUFVDL4McGT7LYlVBVQy+DHBl+0YlAoMvgxwYViUGK1p/wDGfdBTteDMJtkoZXy/4KcN/wD55N4T8ofDYxf+fZeg/wAmWFK9bHe0DJ0H+TUsHSfAx8S+hKSCKSKTSJBxpAE0kUkUkUlociDjSKRQ5EEUkUlS0lZduvaRr6DjJoWXpK0bde0bX0HGTQitXhfOTB5Uz5SUumulSlsM5yYPKmfKSl0ZtJlUEkEgCCSAIFJACWkkgkAAQBJ4t+4nxMP809+dD2c8W/cT4mH+ae/OhnL2tQ6KBS0sk3nJvUhsHBnVbOS0sU/nZvUhs/Bn2tnKP14/h4M/dLreDHBnZcGdVEW5xDXVd4tM038JE0zce4dZziIc6titbQ5YnUzx4ujRL/qmXiQ8za4i0Nb5Hiqruqv4JZVoSX/fWfFtbHzc+V69Xx9ye6VOIwjyZ7k56U9EYN2YY+i1ZGpNSJOmj+43WRJHstaSaWeVfeioqf8AR4qdmwxFoYJv6U34VX8Ui6F7DWO9P/1LM4PWanEKh1sPjLI3oktaV090cHMulf8AFfebHwXEeqMri3Li66oKh2HBjgxySnX1BUOw4Mw2t+4YXazv5qvj4J71XUhJziF42+dTiFQ8/fx9rmaK7lZZJEpokWVFpT8/ed6zbROJ6qP5FdroVZfGVF41XQZ/ZErwlsdQVD7OHzO1JS5eSz+HjQugyeCN84Z4sCoKhn8EOCHIpgVDrolJQwtHm1//AA2DgjrIpJVh7Uv/AI19aHLem9rJ0wj5Q13Y5f8An2VaP9D75CwRX3Y/n5m6L75CwB8fD2vfl5SQQQWmXIgg4lRyIIALSQQRSByIONIpKgVp259o2voOMmhZSkrXtz7RtfQcZNDMtNZhnOTB5Uz5SUujNpKXQznJg8qZ8pKXRm0qZVB8Xr6R0lMy/lrPpMtVFX3IlJrL59M+nVV0e41jjbMyynja8X+P4dWs+H3po6xTFB3YtlfemjrFH3po6xTFBBk/emjrFH3po6xTGARk/emjrFH3po6xTGBVZX3po6xTyrbd5O8fsSzzKtDp7p6SHpZ5htp+sx+befMhy3fa3h5Zuy8taHz+em9SG2cGddsQzOn0KezTJSv3mdNP+Mpvv3Fxqm+0p6dvdiMIhxzwvKXmEZjDiFO6PCd9Mn4ZNXHNqQ8baWt+2PVev51nmXXoRNScSFlX2ycFaXsz164eTzzeKqr2Y+NjIDg0+NmJOdysY1Cs9JNJZexsBwafGzCxsBwafGzGZy7NK0AsxY2A4NPjZiLGwHBp8bMSxWamjiNlYNom5holmm4Z36M/jQn+K69090sZAcGnxswsZAcGnxsxqM6Z421SHR6Ht9WVJuBeKlKyPFRN94SqbFURdHjToMmxsAp+Gnxs3huHds8IY2V2jt3K8qporPJplT81Okbsd2eDzyKxdmhcip4PH3+l2i/Nq3DyRrbH7c9V6+nWZV0J7pU1IWJe7JwV9PNO8cTzzzLSsyvZqVOFkIFg0+NmM5bkSvClbaSaSyFj4Fg0+NmJsfAsGnxsxnlj3Wlc3b546mSZ3PNIqe9FNoZdpmpylR6iP5fChV/n4ceig9kshAsGnxsxFj4Fg0+NmLG5ScWiuNp4e9WVHtdzT4fi/FR9lDZHTSyP0RXb51NT7q0tP0ppO2sdAsGnxkxMux8DkWmRneSLrR7Mim/3R6pwYvB8R1MYd0Q1rX/xL60N5cQplZ5asnCr03k06/VTqdoWNzJBYhMiKio4mVPHjQznuxOExC441lDyLZZVSMs6yqqLVe/Ie2cO+9NTxHZjnhn6L35D2c8u37I+3bP3Ptw7701HDvvTU+IOlMW+3DvfTUnh3vpKfAGkfbh3vpKOFn9JT4glD68LP6SnJH8+undPgBKuzdvUebp9aTqEVZVpQ7KSevLSYmGn1K17ce0bX0HGTQsmVr239omvoOMmhmVhrcM5yYPKmfKSl0ZtKlLoZzkweVM+UlLozaVMNMJrVUcT0cRraGxNnw8+7L6zXjrh6ucgAOjIAAAAAAAAeY7Z/rsXm3nzIenGl7UQt62uXb5xKrydzSiy+9ZF8Vo4znuRM4TTph5dtsFzQ98qefLKeiFbYfH4rBnMzMzzSu5K6zrLM5Sday6fFfUdjbWPda7zeUxGUVHlauVgQV+trHutd5vKLax7rXebyl5RqcFgQV+trHutd5vKLax7rXebyjnGpx/CwIK/W1j3Wu83lFtY91rvN5RzjVOP4WBBX62se613m8otrHutd5vKTnGpxWBBX62se613m8otrHutd5vKOcarxWBBX62se613m8otrHutd5vKOcapxWBBX62se613m8otrHutd5vKOcanFYEFfrax7rXebyi2se613m8peUarxWBBX62se613m8otrHutd5vKOUanFYE17aPmOJeTzetDx+2se613m8pjNW1UZbmd6zPXjuZ2+lqTojmWVVRdSpoMzlfc411fPZfnhn6L35D2k8y2WhT+V/8Ae3zuZ1LIio7raZq3gq7lGhT0067fhnLrKAAbYAAAAAAAADLcaFMQynGhTMqy6Stm23tE19Bxk0LHlcdtvaFq6DjJoc5ahrUM5yYPKmfKSl0ZtKlL4XzkweVM+UlLnTfyXdMNsNs+Hn3ZfWa8bC1/Dz7svrNeOuHqxIADowAAAPcoIA84ebTxB3PNJM5Z0WVVRfCbtPnapu6pn+k3ad9FNn5WydXzmZHbxdKL/GZdfEa5ZiJa2f7f+x55/Z3do4dofW1Tf1TP9Ju0JtU3p/8AUzfSbtPlZeI62fGLdFl4jrZ8Yt0n9O61jo52obMHZMWLTteDseLOFl4jrZ8Yt0WXiOtnxi3RW4Vjo52na8HY8WLTteDseLOFl4jrZ8Yt0WXiOtnxi3SVuHxc7TteDseLFp2vB2PFnCy8R1s+MW6LLxHWz4xborcPi52na8HY8WLTteDseLOFl4jrZ8Yt0WXiOtnxi3RW4Vjo52na8HY8WLTteDseLOFl4jrZ8Yt0WXiOtnxi3RW4Vjo52na8HY8WLTteDseLOFl4jrZ8Yt0WXiOtnxi3RW4Vjo52na8HY8WLTteDseLOFl4jrZ8Yt0WXiOtnxi3RW4Vjo52na8HY8WLTteDseLOFl4jrZ8Yt0WXiOtnxi3RW4Vjo52na8HY8WLTteDseLOFl4jrZ8Yt0WXiOtnxi3S1uFY6Odp2vB2PFi07Xg7HizhZeI62fGLdFl4jrZ8Yt0VuFY6Odp2vB2PFkWnbMHY8WcbLxHWz4xbosvEdbPjFuk/qVjo+tqm7qmb7M3aLVN/VM/wBJu0+Vl4jrZ8Yt0WXiOtnxi3S/17lY6Ppapv6pn+k3aRapv6pm+k3afOy8S1s+MW6dswbMK7nR41zSzVVpR3ItMq7qlj9nrKTxhuLG8ePmZy9epLLPPIk00qaEXiMshERNBJ6HEAAAAADJc+8xjIc+8isgrjtt7QtXQcZNCxhXLbX2haug4yaHOWoa7C+c2Dypnykpc6b+S7pTGF85MHlTPlJS5038l3Tm2w2z4efdl9ZrxsDZ+hN/b6zXztt+rnkAA2yAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB9nehT4n2k0KRX2pK6ba+0LV0HGTQsUV0209oWroOMmhzy8Nw12Gc5MHlTPlJS5s38pt0plC+cmHypnykpcyb+S7qmGmG1/oTf2+s6E7xr/Rm/t9Z0Z1x6Oc9QAG2QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPrJoU+Rzl95FfUrttn7QNXQcZNCw66CvG2fP7T0HPyIYy8NQ16F85MPlTjKSly5/5Lur6ymkM5xYfKnGUlLkTfyXdX1nOGmI1fpTfl6zpTvniVncyHQ6DrDAADbKASAIBIAgEgCASAIBIAgEgCASAIBIAgEgCASAIBIAgEgCASAIBIAgEgCASAIBIAgEgCASAIBIAg5IQCDmV62z5/aeg5+QsGV72y5/aeg5+Qxl4bhqLt5M6nkeSLVnkmSeWZNMs0q0oqbim02v2j5TaPpJcNTByabVa/aPlRo3lw+K7UR5VpWIv6V6F01kFGy2njvKD/eXRaeO8oP8AeXTWgauUqGzWnjvKD/eXRaeO8oP95dNbAuSobJaeO8oP95dFp47yg/3l01sC5Khslp47yg/3l0WnjvKD/eXTWwLkqGyWnjvKD/eXRaeO8oP95dNbAuSobJaeO8oP95dFp47yg/3l01sC5Khslp47yg/3l0WnjvKD/eXTWwLkqGyWnjvKD/eXRaeO8oP95dNbAuSobJaeO8oP95dFp47yg/3l01sC5Khslp47yg/3l0WnjvKD/eXTWwLkqGyWnjvKD/eXRaeO8oP95dNbAuSobJaeO8oP95dFp47yg/3l01sC5Khslp47yg/3l0WnjvKD/eXTWwLkqGyWnjvKD/eXRaeO8oP95dNbAuSobJaeO8oP95dFp47yg/3l01sC5Khslp47yg/3l0WnjvKD/eXTWwLkqGyWnjvKD/eXRaeO8oP95dNbAuSobJaeO8oP95dFp47yg/3l01sC5Khslp47yg/3l0WnjvKD/eXTWwLkqGyWnjvKD/eXRaeO8oP95dNbAuSobJaeO8oP95dFp47yg/3l01sC5Khslp47yg/3l0WnjvKD/eXTWwS1pslp47yg/wB5dOlampobX0z9peTPnsyIk081FK0JQmhE0IYoIr//2Q==",
  quotes: "data:image/jpeg;base64,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",
};

const STYLE_BLURB: Record<string, string> = {
  whip: "Fast montage, smear transitions, flashes, scope bars, title card",
  motion: "Push-in from a device screen, illustrated flight, hand-drawn labels",
  quotes: "Iris open, then a run of talking-head lines over a music bed",
};

const STYLES = [
  { value: "whip", label: "Whip cut", short: "Whip" },
  { value: "motion", label: "Motion graphics", short: "Motion" },
  { value: "quotes", label: "Funny quotes", short: "Quotes" },
] as const;

const LENGTHS = [
  { value: "short", label: "Short" },
  { value: "standard", label: "Standard" },
  { value: "long", label: "Long" },
] as const;

const LENGTH_SCALE: Record<string, number> = { short: 0.75, standard: 1, long: 1.35 };

// Always applied, so the opening hands off cleanly to the next timeline.
const FADE_SECONDS = 0.6;

// Role -> scene-search query. Content varies with the footage; the roles do not.
const ROLE_QUERIES: Record<string, string> = {
  hook: "wide establishing landscape view with camera movement",
  travel: "view from inside a moving vehicle, window or transit",
  montage: "person walking through a landscape",
  scenic: "beautiful scenic wide shot",
  people: "people together laughing and facing the camera",
  face: "close-up of a person's face outdoors",
  finale: "people walking at sunset or golden hour, wide shot",
};

// Beat templates. Durations in seconds; burst beats stay fixed when scaled.
const TEMPLATES: Record<string, Array<{ role: string; dur: number; fixed?: boolean; optional?: number }>> = {
  whip: [
    { role: "hook", dur: 2.2 },
    { role: "travel", dur: 0.7, optional: 3 },
    { role: "travel", dur: 0.8, optional: 2 },
    { role: "scenic", dur: 0.25, fixed: true },
    { role: "hook", dur: 0.25, fixed: true },
    { role: "montage", dur: 0.25, fixed: true },
    { role: "travel", dur: 0.25, fixed: true },
    { role: "montage", dur: 1.3 },
    { role: "scenic", dur: 1.0, optional: 4 },
    { role: "scenic", dur: 1.0, optional: 5 },
    { role: "travel", dur: 0.9, optional: 6 },
    { role: "people", dur: 1.4 },
    { role: "face", dur: 1.0, optional: 7 },
    { role: "people", dur: 1.2, optional: 8 },
    { role: "finale", dur: 2.2 },
  ],
  motion: [
    { role: "people", dur: 3.3 },
    { role: "people", dur: 1.7, continues: true } as any,
    { role: "travel", dur: 1.6 },
    { role: "scenic", dur: 2.4 },
    { role: "scenic", dur: 2.0 },
    { role: "montage", dur: 2.0, optional: 3 },
    { role: "finale", dur: 3.0 },
  ],
  quotes: [],
};

// ---------------------------------------------------------------------------
// Remotion sources used by the generated Draft. Embedded into the build script
// with JSON.stringify, so the same code runs from chat and from this panel.
// ---------------------------------------------------------------------------

const GFX_SMEAR = `
import React from "react";
import { AbsoluteFill } from "remotion";

export default function WhipSmear({ children, presentationProgress, presentationDirection, data }) {
  const p = typeof presentationProgress === "number" ? presentationProgress : 0;
  const amount = data && typeof data.amount === "number" ? data.amount : 1;
  const angle = data && typeof data.angle === "number" ? data.angle : 0;
  const exiting = presentationDirection === "exiting";
  const env = Math.sin(Math.PI * p);
  const along = env * 62 * amount;
  const across = Math.max(0.4, env * 3.5);
  const shift = (exiting ? -p : 1 - p) * 16 * amount;
  const opacity = exiting ? 1 - Math.pow(p, 1.7) : Math.pow(p, 0.55);
  const id = "smear" + Math.round(angle * 10) + "x" + Math.round(amount * 100) + (exiting ? "e" : "n");
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={id} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={along + " " + across} />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ transform: "rotate(" + angle + "deg) translateX(" + shift + "%) scale(1.95)", filter: "url(#" + id + ")", opacity: opacity }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;

const GFX_FLASH = `
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export default function FlashPop({ data }) {
  const frame = useCurrentFrame();
  const len = data && typeof data.lengthFrames === "number" && data.lengthFrames > 1 ? data.lengthFrames : 8;
  const intensity = data && typeof data.intensity === "number" ? data.intensity : 0.92;
  const color = data && typeof data.color === "string" ? data.color : "#ffffff";
  const p = Math.min(1, Math.max(0, frame / (len - 1)));
  const op = Math.pow(Math.sin(Math.PI * p), 0.65) * intensity;
  return <AbsoluteFill style={{ backgroundColor: color, opacity: op }} />;
}
`;

const GFX_LETTERBOX = `
import React from "react";
import { AbsoluteFill } from "remotion";

export default function Letterbox({ data }) {
  const ratio = data && typeof data.ratio === "number" ? data.ratio : 2.39;
  const frameRatio = data && typeof data.frameRatio === "number" ? data.frameRatio : 16 / 9;
  const barPct = Math.max(0, (1 - frameRatio / ratio) / 2) * 100;
  const bar = { position: "absolute", left: 0, right: 0, height: barPct + "%", backgroundColor: "#000000" };
  return (
    <AbsoluteFill>
      <div style={{ ...bar, top: 0 }} />
      <div style={{ ...bar, bottom: 0 }} />
    </AbsoluteFill>
  );
}
`;

const GFX_FADE = `
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export default function FadeOut({ data }) {
  const frame = useCurrentFrame();
  const len = data && typeof data.lengthFrames === "number" && data.lengthFrames > 1 ? data.lengthFrames : 18;
  const color = data && typeof data.color === "string" ? data.color : "#000000";
  const p = Math.min(1, Math.max(0, frame / (len - 1)));
  return <AbsoluteFill style={{ backgroundColor: color, opacity: Math.pow(p, 1.35) }} />;
}
`;

const GFX_CARD = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function TitleCard({ data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = (data && data.title) || "TITLE";
  const subtitle = (data && data.subtitle) || "";
  const ink = (data && data.ink) || "#f4f1ec";
  const family = data && typeof data.fontFamily === "string" && data.fontFamily.trim() !== ""
    ? '"' + data.fontFamily.trim() + '", "Helvetica Neue", Arial, sans-serif'
    : '"Helvetica Neue", Arial, sans-serif';
  const flash = interpolate(frame, [0, Math.round(fps * 0.18)], [1, 0], { extrapolateRight: "clamp" });
  // Fit whatever name the Project has without overflowing the frame.
  const fit = Math.max(0.4, Math.min(1, 12 / Math.max(1, String(title).length)));
  const track = interpolate(frame, [0, Math.round(fps * 1.2)], [0.42, 0.62], { extrapolateRight: "clamp" }) * fit;
  const rise = interpolate(frame, [0, Math.round(fps * 0.5)], [22, 0], { extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [Math.round(fps * 0.28), Math.round(fps * 0.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#07080a", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", transform: "translateY(" + rise + "px)" }}>
        <div style={{ fontFamily: family, color: ink, fontSize: (7.2 * fit) + "vh", fontWeight: 300, letterSpacing: track + "em", textIndent: track + "em", maxWidth: "88vw", lineHeight: 1.12 }}>{title}</div>
        {subtitle ? <div style={{ marginTop: "2.6vh", fontFamily: family, color: "#9aa3ab", fontSize: "1.9vh", letterSpacing: "0.5em", textIndent: "0.5em", opacity: subOp }}>{subtitle}</div> : null}
      </div>
      <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: flash }} />
    </AbsoluteFill>
  );
}
`;

const GFX_DESK = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export default function DeskScene({ Source, children, data }) {
  const frame = useCurrentFrame();
  const hold = data && typeof data.holdFrames === "number" ? data.holdFrames : 70;
  const push = data && typeof data.pushFrames === "number" ? data.pushFrames : 22;
  const paper = (data && data.paper) || "#eef3f6";
  const surface = (data && data.surface) || "#b9c8da";
  const accent = (data && data.accent) || "#a79289";
  const chrome = (data && data.chrome) || "#3a3630";
  const t = interpolate(frame, [hold, hold + push], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = t * t * (3 - 2 * t);
  const s0 = 34;
  const w = s0 + (100 - s0) * e;
  const cx = 50, cy = 43 + (50 - 43) * e;
  const roomOpacity = 1 - e;
  const rect = { position: "absolute", left: (cx - w / 2) + "%", top: (cy - w / 2) + "%", width: w + "%", height: w + "%", overflow: "hidden", borderRadius: (0.6 * (1 - e)) + "vw", backgroundColor: "#000" };
  const lid = { position: "absolute", left: (cx - w / 2 - 1.1) + "%", top: (cy - w / 2 - 1.8) + "%", width: (w + 2.2) + "%", height: (w + 3.6) + "%", backgroundColor: chrome, borderRadius: "1vw", opacity: roomOpacity };
  const base = { position: "absolute", left: (cx - w / 2 - 7) + "%", top: (cy + w / 2 + 1.8) + "%", width: (w + 14) + "%", height: "3.2%", backgroundColor: chrome, filter: "brightness(1.35)", borderRadius: "0 0 1.2vw 1.2vw", opacity: roomOpacity };
  return (
    <AbsoluteFill style={{ backgroundColor: paper }}>
      <AbsoluteFill style={{ opacity: roomOpacity, background: "linear-gradient(160deg,#f6fafc 0%," + paper + " 50%," + surface + " 100%)" }} />
      <div style={{ position: "absolute", left: "4%", top: "56%", width: "92%", height: "48%", backgroundColor: surface, borderRadius: "3vw", opacity: roomOpacity }} />
      <div style={{ position: "absolute", left: "10%", top: "10%", width: "13%", height: "23%", backgroundColor: accent, borderRadius: "1.5vw", opacity: roomOpacity * 0.85 }} />
      <div style={lid} />
      <div style={base} />
      <div style={rect}>{Source ? <Source /> : children}</div>
    </AbsoluteFill>
  );
}
`;

const GFX_SKY = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export default function SkyFlight({ data }) {
  const frame = useCurrentFrame();
  const len = data && typeof data.lengthFrames === "number" ? data.lengthFrames : 60;
  const top = (data && data.skyTop) || "#4d7ec4";
  const mid = (data && data.skyMid) || "#7db9f2";
  const low = (data && data.skyLow) || "#eef3f6";
  const planeBody = (data && data.planeColor) || "#1f3a5f";
  const wing = (data && data.wingColor) || "#8998b3";
  const p = Math.min(1, Math.max(0, frame / len));
  const x = interpolate(p, [0, 1], [-18, 112]);
  const y = interpolate(p, [0, 0.5, 1], [62, 44, 30]);
  const cloudA = interpolate(p, [0, 1], [10, -22]);
  const cloudB = interpolate(p, [0, 1], [70, 38]);
  const dashes = [];
  for (let i = 1; i <= 14; i++) {
    const dx = x - i * 5.2;
    const dy = y + i * 1.15;
    if (dx < -8) continue;
    dashes.push(<div key={i} style={{ position: "absolute", left: dx + "%", top: dy + "%", width: "1.7%", height: "0.5%", borderRadius: "1vw", backgroundColor: "#f6fafc", opacity: Math.max(0, 0.85 - i * 0.06) }} />);
  }
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg," + top + " 0%," + mid + " 45%," + low + " 100%)" }}>
      <div style={{ position: "absolute", left: "72%", top: "14%", width: "12%", height: "21%", borderRadius: "50%", backgroundColor: "#f6fafc", opacity: 0.85 }} />
      <div style={{ position: "absolute", left: cloudA + "%", top: "22%", width: "26%", height: "13%", borderRadius: "6vw", backgroundColor: "#f6fafc", opacity: 0.82 }} />
      <div style={{ position: "absolute", left: cloudB + "%", top: "66%", width: "34%", height: "15%", borderRadius: "8vw", backgroundColor: "#dbe6ef", opacity: 0.8 }} />
      {dashes}
      <div style={{ position: "absolute", left: x + "%", top: y + "%", width: "9%", height: "5%", transform: "rotate(-12deg)" }}>
        <div style={{ position: "absolute", left: 0, top: "38%", width: "100%", height: "26%", borderRadius: "2vw", backgroundColor: planeBody }} />
        <div style={{ position: "absolute", left: "34%", top: "-46%", width: "26%", height: "120%", borderRadius: "1vw", backgroundColor: wing, transform: "rotate(14deg)" }} />
        <div style={{ position: "absolute", left: "2%", top: "-30%", width: "16%", height: "70%", borderRadius: "0.6vw", backgroundColor: planeBody }} />
      </div>
    </AbsoluteFill>
  );
}
`;

const GFX_LABEL = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function PlaceLabel({ data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = (data && data.text) || "";
  const sub = (data && data.sub) || "";
  const ink = (data && data.ink) || "#eef3f6";
  const shadow = (data && data.shadow) || "#132851";
  const family = data && typeof data.fontFamily === "string" && data.fontFamily.trim() !== ""
    ? '"' + data.fontFamily.trim() + '", "Snell Roundhand", cursive'
    : '"Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive';
  const inT = interpolate(frame, [0, Math.round(fps * 0.45)], [0, 1], { extrapolateRight: "clamp" });
  const outT = interpolate(frame, [Math.round(fps * 1.6), Math.round(fps * 2.0)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = Math.min(inT, outT);
  const line = interpolate(frame, [Math.round(fps * 0.25), Math.round(fps * 0.9)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = "0 0.4vh 1.8vh " + shadow;
  if (!text) return <AbsoluteFill />;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: "7%", bottom: "12%", opacity: op, transform: "translateY(" + ((1 - inT) * 26) + "px)" }}>
        <div style={{ fontFamily: family, color: ink, fontSize: (9 * Math.max(0.45, Math.min(1, 14 / Math.max(1, String(text).length)))) + "vh", lineHeight: 1.05, maxWidth: "62vw", textShadow: glow }}>{text}</div>
        <div style={{ marginTop: "1vh", height: "0.5vh", width: (line * 100) + "%", maxWidth: "34vw", backgroundColor: ink, borderRadius: "1vh", boxShadow: glow }} />
        {sub ? <div style={{ marginTop: "1.4vh", fontFamily: '"Helvetica Neue", Arial, sans-serif', color: ink, fontSize: "2vh", letterSpacing: "0.42em", textIndent: "0.42em", opacity: line, textShadow: glow }}>{sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
}
`;

const GFX_SIGNOFF = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function Signoff({ data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = (data && data.title) || "";
  const sub = (data && data.sub) || "";
  const ink = (data && data.ink) || "#f6fafc";
  const shadow = (data && data.shadow) || "#132851";
  const family = data && typeof data.fontFamily === "string" && data.fontFamily.trim() !== ""
    ? '"' + data.fontFamily.trim() + '", "Snell Roundhand", cursive'
    : '"Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive';
  const fit = Math.max(0.4, Math.min(1, 11 / Math.max(1, String(title).length)));
  const appear = interpolate(frame, [Math.round(fps * 0.5), Math.round(fps * 1.15)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stroke = interpolate(frame, [Math.round(fps * 1.0), Math.round(fps * 1.8)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [Math.round(fps * 1.3), Math.round(fps * 1.8)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = "0 0.6vh 2.6vh " + shadow;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", opacity: appear, transform: "scale(" + (0.92 + 0.08 * appear) + ")" }}>
        <div style={{ fontFamily: family, color: ink, fontSize: (16 * fit) + "vh", lineHeight: 1.06, maxWidth: "86vw", textShadow: glow }}>{title}</div>
        <div style={{ margin: "1.2vh auto 0", height: "0.6vh", width: (stroke * 38) + "vw", backgroundColor: ink, borderRadius: "1vh", boxShadow: glow }} />
        {sub ? <div style={{ marginTop: "2.2vh", fontFamily: '"Helvetica Neue", Arial, sans-serif', color: ink, fontSize: "2.2vh", letterSpacing: "0.55em", textIndent: "0.55em", opacity: subOp, textShadow: glow }}>{sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
}
`;

const GFX_IRIS = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export default function IrisOpen({ Source, children, data }) {
  const frame = useCurrentFrame();
  const hold = data && typeof data.holdFrames === "number" ? data.holdFrames : 6;
  const open = data && typeof data.openFrames === "number" ? data.openFrames : 16;
  const t = interpolate(frame, [hold, hold + open], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = 1 - Math.pow(1 - t, 3);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ clipPath: "circle(" + (2 + 78 * e) + "% at 50% 50%)", transform: "scale(" + (1.18 - 0.18 * e) + ")" }}>
        {Source ? <Source /> : children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;

const GFX_MARK = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function Watermark({ data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = (data && data.text) || "";
  const ink = (data && data.ink) || "#fbf7f0";
  const fade = interpolate(frame, [Math.round(fps * 3.0), Math.round(fps * 3.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (!text) return <AbsoluteFill />;
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div style={{ marginTop: "4.5vh", fontFamily: '"Helvetica Neue", Arial, sans-serif', color: ink, fontSize: "1.9vh", letterSpacing: "0.34em", textIndent: "0.34em", maxWidth: "80vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: fade * 0.75, textShadow: "0 0.2vh 1vh rgba(0,0,0,0.55)" }}>
        {"\u2726 " + text + " \u2726"}
      </div>
    </AbsoluteFill>
  );
}
`;

const GFX_SHOWTITLE = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function ShowTitle({ data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = (data && data.title) || "";
  const edition = (data && data.edition) || "";
  const ink = (data && data.ink) || "#fbf7f0";
  const family = data && typeof data.fontFamily === "string" && data.fontFamily.trim() !== ""
    ? '"' + data.fontFamily.trim() + '", "Snell Roundhand", cursive'
    : '"Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive';
  const fit = Math.max(0.42, Math.min(1, 11 / Math.max(1, String(title).length)));
  const inA = interpolate(frame, [Math.round(fps * 0.7), Math.round(fps * 1.25)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outA = interpolate(frame, [Math.round(fps * 2.4), Math.round(fps * 3.0)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const edOp = interpolate(frame, [Math.round(fps * 1.1), Math.round(fps * 1.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = Math.min(inA, outA);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", opacity: op, transform: "translateY(" + ((1 - inA) * 18) + "px)" }}>
        <div style={{ fontFamily: family, color: ink, fontSize: (13 * fit) + "vh", lineHeight: 1.08, maxWidth: "86vw", textShadow: "0 0.5vh 2.2vh rgba(0,0,0,0.55)" }}>{title}</div>
        {edition ? <div style={{ marginTop: "1.6vh", fontFamily: '"Helvetica Neue", Arial, sans-serif', color: ink, fontSize: "2.1vh", letterSpacing: "0.5em", textIndent: "0.5em", opacity: edOp * 0.95, textShadow: "0 0.3vh 1.2vh rgba(0,0,0,0.6)" }}>{edition}</div> : null}
      </div>
    </AbsoluteFill>
  );
}
`;

// ---------------------------------------------------------------------------
// Scripts. Every value the user typed is interpolated with JSON.stringify.
// ---------------------------------------------------------------------------

function readinessScript(projectId: string) {
  return `
const p = selects.project(${JSON.stringify(projectId)});
const res = await p.resources();
const video = res.filter(r => r.type === "Video" && r.hasAnalysis && (r.durationSeconds || 0) >= 1.2);
const paths = {};
const walk = (n) => {
  if (n.type === "dir") (n.children || []).forEach(walk);
  else if (n.path) paths[n.resourceId] = n.path;
};
try {
  const sf = await p.sourceFiles();
  const tree = "fileTree" in sf ? sf.fileTree : null;
  if (tree) tree.forEach(walk);
  else {
    const org = await p.organizeClips();
    for (const f of (org.folders || [])) {
      try { const detail = await p.sourceFiles({ folder: f.path || f.name }); ("fileTree" in detail ? detail.fileTree || [] : []).forEach(walk); } catch (e) {}
    }
    try { const rootDetail = await p.sourceFiles({ folder: "(root)" }); ("fileTree" in rootDetail ? rootDetail.fileTree || [] : []).forEach(walk); } catch (e) {}
  }
} catch (e) {}
const audio = res
  .filter(r => r.type === "Audio")
  .map(r => ({ id: r.resourceId, name: r.name, seconds: r.durationSeconds || 0, path: paths[r.resourceId] || null }));
audio.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
let speech = 0;
const probe = video.slice().sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0)).slice(0, 12);
for (let i = 0; i < probe.length; i += 6) {
  const rows = await Promise.all(probe.slice(i, i + 6).map(async r => {
    try {
      const t = await p.resource(r.resourceId).turns({ limit: 8 });
      return t.items.some(x => (x.text || "").replace(/\\[[^\\]]*\\]/g, "").trim().length > 3) ? 1 : 0;
    } catch (e) { return 0; }
  }));
  speech += rows.reduce((a, b) => a + b, 0);
}
return { clips: video.length, probed: probe.length, withSpeech: speech, audio: audio.slice(0, 40), totalSeconds: Math.round(video.reduce((a, r) => a + (r.durationSeconds || 0), 0)) };
`;
}

function poolScript(projectId: string, poolSize: number) {
  return `
const p = selects.project(${JSON.stringify(projectId)});
const all = await p.resources();
const portrait = new Set();
const paths = {};
const walk = (n) => {
  if (n.type === "dir") (n.children || []).forEach(walk);
  else {
    if (n.frameSize && n.frameSize.height > n.frameSize.width) portrait.add(n.resourceId);
    if (n.path) paths[n.resourceId] = n.path;
  }
};
try {
  const sf = await p.sourceFiles();
  const tree = "fileTree" in sf ? sf.fileTree : null;
  if (tree) tree.forEach(walk);
  else {
    // Big projects answer sourceFiles() with a summary; ask folder by folder so
    // frame sizes and paths are still known.
    const org = await p.organizeClips();
    const folders = (org.folders || []).map(f => f.path || f.name);
    for (const folder of folders) {
      try { const detail = await p.sourceFiles({ folder }); ("fileTree" in detail ? detail.fileTree || [] : []).forEach(walk); } catch (e) {}
    }
  }
} catch (e) {}
const num = (id) => { const m = /(\\d+)/.exec(String(id)); return m ? parseInt(m[1], 10) : 0; };
const eligible = all
  .filter(r => r.type === "Video" && r.hasAnalysis && (r.durationSeconds || 0) >= 2 && !portrait.has(r.resourceId))
  .sort((a, b) => num(a.resourceId) - num(b.resourceId) || (a.resourceId < b.resourceId ? -1 : 1));
const CAP: number = ${poolSize};
// Spread the pool across the whole library rather than favouring long clips.
const chosen = eligible.length <= CAP
  ? eligible
  : Array.from({ length: CAP }, (_, i) => eligible[Math.round((i * (eligible.length - 1)) / (CAP - 1))]);
return {
  eligible: eligible.length,
  portrait: portrait.size,
  pool: chosen.map(r => ({ rid: r.resourceId, name: r.name, total: r.durationSeconds || 0, path: paths[r.resourceId] || null })),
};
`;
}

function searchRoleScript(projectId: string, query: string, rids: string[]) {
  return `
const p = selects.project(${JSON.stringify(projectId)});
const RIDS: string[] = ${JSON.stringify(rids)};
const QUERY: string = ${JSON.stringify(query)};
// The scene-search backend drops requests when the app is busy. A swallowed
// failure would silently change the cut, so keep re-trying the clips that
// failed and report any that never answered.
const byRid = {};
let pending = RIDS.slice();
for (let pass = 0; pass < 4 && pending.length; pass++) {
  const next = [];
  for (let i = 0; i < pending.length; i += 8) {
    const batch = pending.slice(i, i + 8);
    const res = await Promise.all(batch.map(async rid => {
      try {
        const page = await p.resource(rid).searchScenes(QUERY, { pageSize: 2 });
        if (page && page.results && !page.error) return page.results;
        return null;
      } catch (e) { return null; }
    }));
    res.forEach((r, k) => { if (r === null) next.push(batch[k]); else byRid[batch[k]] = r; });
  }
  pending = next;
}
const found = [];
for (const rid of RIDS) {
  const rows = byRid[rid];
  if (!rows) continue;
  rows.forEach(h => found.push({
    rid,
    t: Math.round((h.timeSeconds || 0) * 100) / 100,
    score: Math.round((h.score || 0) * 1e4) / 1e4,
  }));
}
found.sort((a, b) => b.score - a.score || (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0) || a.t - b.t);
return { hits: found.slice(0, 40), failed: pending, scanned: RIDS.length - pending.length };
`;
}

// Deterministic assignment: best unused clip per role, windows clamped to the
// source and never overlapping a window already taken from the same clip.
function assignBeats(template: any[], hitsByRole: Record<string, any[]>, pool: any[]) {
  const byId: Record<string, any> = {};
  for (const row of pool) byId[row.rid] = row;
  const usedRes = new Set<string>();
  const usedWin: Array<{ rid: string; a: number; b: number }> = [];
  const beats: any[] = [];
  const dropped: any[] = [];
  const order = template.map((b: any, i: number) => ({ b, i })).sort((x, y) => y.b.dur - x.b.dur || x.i - y.i);
  const slots: any[] = new Array(template.length).fill(null);
  const place = (total: number, t: number, dur: number) => {
    const s = Math.max(0, Math.min(t - dur * 0.35, total - dur));
    return { a: Math.round(s * 100) / 100, b: Math.round((s + dur) * 100) / 100 };
  };
  const overlaps = (rid: string, a: number, b: number) => usedWin.some(w => w.rid === rid && a < w.b && b > w.a);
  for (const entry of order) {
    const b = entry.b;
    if (b.continues) {
      const prev = slots[entry.i - 1];
      if (!prev) { dropped.push({ role: b.role, reason: "nothing to continue" }); continue; }
      const room = prev.total - prev.b;
      if (room >= b.dur * 0.6) {
        const dur = Math.min(b.dur, room);
        const next = { role: b.role, rid: prev.rid, name: prev.name, total: prev.total, a: prev.b, b: Math.round((prev.b + dur) * 100) / 100, path: prev.path, continues: true };
        usedWin.push({ rid: prev.rid, a: next.a, b: next.b });
        beats.push(next);
        slots[entry.i] = next;
        continue;
      }
      dropped.push({ role: b.role, reason: "no room to continue" });
      continue;
    }
    const list = hitsByRole[b.role] || [];
    let pick: any = null;
    for (const h of list) {
      const row = byId[h.rid];
      if (!row || row.total < b.dur + 0.2) continue;
      if (usedRes.has(h.rid)) continue;
      pick = { h, row };
      break;
    }
    if (!pick) {
      for (const h of list) {
        const row = byId[h.rid];
        if (!row || row.total < b.dur + 0.2) continue;
        const w = place(row.total, h.t, b.dur);
        if (overlaps(h.rid, w.a, w.b)) continue;
        pick = { h, row };
        break;
      }
    }
    if (!pick) { dropped.push({ role: b.role, reason: "no candidate" }); continue; }
    const win = place(pick.row.total, pick.h.t, b.dur);
    usedRes.add(pick.h.rid);
    usedWin.push({ rid: pick.h.rid, a: win.a, b: win.b });
    const placed = { role: b.role, rid: pick.h.rid, name: pick.row.name, total: pick.row.total, a: win.a, b: win.b, score: pick.h.score, path: pick.row.path };
    beats.push(placed);
    slots[entry.i] = placed;
  }
  return { beats: slots.filter(Boolean), dropped };
}

function selectQuotesScript(projectId: string, budgetSeconds: number, poolSize: number) {
  return `
const p = selects.project(${JSON.stringify(projectId)});
const BUDGET: number = ${budgetSeconds};
const all = await p.resources();
const num = (id) => { const m = /(\\d+)/.exec(String(id)); return m ? parseInt(m[1], 10) : 0; };
const eligible = all
  .filter(r => r.type === "Video" && r.hasAnalysis && (r.durationSeconds || 0) >= 2)
  .sort((a, b) => num(a.resourceId) - num(b.resourceId) || (a.resourceId < b.resourceId ? -1 : 1));
const CAP: number = ${poolSize};
const pool = eligible.length <= CAP
  ? eligible
  : Array.from({ length: CAP }, (_, i) => eligible[Math.round((i * (eligible.length - 1)) / (CAP - 1))]);
if (pool.length === 0) return { error: "no_analyzed_video", beats: [] };

const rows = [];
for (let i = 0; i < pool.length; i += 8) {
  const batch = pool.slice(i, i + 8);
  const pages = await Promise.all(batch.map(r => p.resource(r.resourceId).turns({ limit: 250 }).catch(() => null)));
  pages.forEach((pg, k) => {
    if (!pg) return;
    const items = pg.items;
    items.forEach((t, idx) => {
      const raw = (t.text || "").trim();
      const clean = raw.replace(/\\[[^\\]]*\\]/g, "").trim();
      if (clean.length < 4 || clean.length > 80) return;
      const startS = t.span.startFrame / 30;
      const endS = t.span.endFrame / 30;
      const next = items[idx + 1];
      const gapNext = next ? next.span.startFrame / 30 - endS : 99;
      let score = 1;
      if (/[?？]\\s*$/.test(clean)) score += 2;
      if (/[!！]/.test(clean)) score += 1;
      if (/[A-Za-z]{3,}/.test(clean) && /[^\\x00-\\x7F]/.test(clean)) score += 2.5;
      if (clean.length >= 6 && clean.length <= 40) score += 1;
      if (gapNext < 1.2) score += 1;
      if (new RegExp("(\ud558\ud558|\u314b\u314b|\uc6c3\uc74c|laugh)", "i").test(raw)) score += 1.5;
      if (/\\[/.test(raw)) score -= 2;
      if (new RegExp("^(\ub124|\uc608|\uc751|\uc5b4|\uc544|\uc74c|\uadf8\ub798)[.!?]?$").test(clean)) score -= 4;
      rows.push({
        rid: batch[k].resourceId, name: batch[k].name, total: batch[k].durationSeconds || 0,
        a: Math.max(0, Math.round((startS - 0.15) * 100) / 100),
        b: Math.round((endS + 0.25) * 100) / 100,
        text: clean, score: Math.round(score * 100) / 100,
      });
    });
  });
}
if (rows.length === 0) return { error: "no_speech", beats: [] };

rows.sort((x, y) => y.score - x.score || (x.rid < y.rid ? -1 : x.rid > y.rid ? 1 : 0) || x.a - y.a);

const beats = [];
const perRes = {};
const seen = new Set();
let used = 0;
for (const pass of [1, 2]) {
  for (const r of rows) {
    if (used >= BUDGET) break;
    const dur = Math.min(3.2, Math.max(1.0, r.b - r.a));
    if (used + dur > BUDGET + 1.2) continue;
    if (r.a + dur > r.total) continue;
    const n = perRes[r.rid] || 0;
    if (n >= pass) continue;
    if (seen.has(r.text)) continue;
    if (beats.some(x => x.rid === r.rid && r.a < x.b && r.a + dur > x.a)) continue;
    perRes[r.rid] = n + 1;
    seen.add(r.text);
    used += dur;
    beats.push({ role: "quote", rid: r.rid, name: r.name, total: r.total, a: r.a, b: Math.round((r.a + dur) * 100) / 100, text: r.text, score: r.score });
  }
}
beats.sort((x, y) => (x.rid < y.rid ? -1 : x.rid > y.rid ? 1 : 0) || x.a - y.a);
return { beats, pool: pool.length, seconds: Math.round(used * 10) / 10 };
`;
}

function assembleScript(projectId: string, draftName: string, beats: any[]) {
  return `
const p = selects.project(${JSON.stringify(projectId)});
const BEATS: any[] = ${JSON.stringify(beats)};
const d = await p.createDraft({ name: ${JSON.stringify(draftName)} });
for (const b of BEATS) {
  // Never ask for more than the source holds, whatever the caller computed.
  const limit = typeof b.total === "number" && b.total > 0 ? b.total : b.b;
  const end = Math.min(b.b, Math.floor(limit * 100) / 100);
  const start = Math.max(0, Math.min(b.a, end - 0.2));
  if (!(end > start)) continue;
  await d.insertResource({ resourceId: b.rid, sourceRange: { startSeconds: start, endSeconds: end } });
}
const clips = (await d.clips({ trackScope: "main" })).filter(c => c.resourceId !== null);
if (!clips.length) return { error: "nothing_placed" };
// Derive the frame rate from what was actually placed; never assume 30.
const fps = Math.max(1, Math.round((clips[0].endFrame - clips[0].startFrame) / (BEATS[0].b - BEATS[0].a)));
const commit = await d.commitAll("Vlog Opening: assemble beats");
return {
  sequenceId: commit.createdDraftId,
  fps,
  mainEnd: clips.reduce((a, c) => Math.max(a, c.endFrame), 0),
  placed: clips.length,
};
`;
}

function decorateScript(opts: {
  sequenceId: string; style: string; fps: number; title: string; subtitle: string;
  letterbox: boolean; palette: Record<string, string>;
}) {
  return `
const d = selects.draft(${JSON.stringify(opts.sequenceId)});
const STYLE: string = ${JSON.stringify(opts.style)};
const TITLE: string = ${JSON.stringify(opts.title)};
const SUBTITLE: string = ${JSON.stringify(opts.subtitle)};
const LETTERBOX: boolean = ${opts.letterbox ? "true" : "false"};
const PALETTE: Record<string, string> = ${JSON.stringify(opts.palette)};
const fps: number = ${opts.fps};
const GFX = ${JSON.stringify({
    smear: GFX_SMEAR, flash: GFX_FLASH, letterbox: GFX_LETTERBOX, card: GFX_CARD,
    desk: GFX_DESK, sky: GFX_SKY, label: GFX_LABEL, signoff: GFX_SIGNOFF,
    iris: GFX_IRIS, mark: GFX_MARK, showtitle: GFX_SHOWTITLE,
  })};
const F = (s) => Math.max(1, Math.round(s * fps));
const notes = [];
let clips = (await d.clips({ trackScope: "main" })).filter(c => c.resourceId !== null);
const mainEnd = () => clips.reduce((a, c) => Math.max(a, c.endFrame), 0);
const addGfx = async (code, from, to, label, params, editable) =>
  d.addMotionGraphic({ label, tsxCode: code, within: await d.rangeAtFrames(Math.max(0, from), to), parameters: params || {}, editableParameters: editable || [] });

if (STYLE === "whip") {
  const angles = [-14, 10, 22, -20, 12, -8, 16, -11];
  let ai = 0;
  for (let i = 0; i < clips.length - 1; i++) {
    if (clips[i].endFrame - clips[i].startFrame < F(0.5)) continue;
    if (clips[i + 1].endFrame - clips[i + 1].startFrame < F(0.5)) continue;
    const angle = angles[ai % angles.length]; ai++;
    try {
      await d.addTransition({
        after: clips[i], label: "Whip smear " + angle + "deg", tsxCode: GFX.smear,
        inOffsetSeconds: 0.12, outOffsetSeconds: 0.12,
        parameters: { amount: 1, angle },
        editableParameters: [
          { key: "amount", label: "Smear strength", type: "number", defaultValue: 1, min: 0, max: 2, step: 0.05 },
          { key: "angle", label: "Smear angle", type: "number", defaultValue: 0, min: -45, max: 45, step: 1 },
        ],
      });
      // Each transition invalidates the cached rows, so re-read before the next.
      clips = (await d.clips({ trackScope: "main" })).filter(c => c.resourceId !== null);
    } catch (e) {
      notes.push("cut " + (i + 1) + " kept hard");
      clips = (await d.clips({ trackScope: "main" })).filter(c => c.resourceId !== null);
    }
  }
  const burst = clips.filter(c => c.endFrame - c.startFrame <= F(0.34));
  if (burst.length) {
    const s = burst[0].startFrame;
    const e = burst[burst.length - 1].endFrame;
    for (const pair of [[s, 0.95], [e, 0.8]]) {
      await addGfx(GFX.flash, pair[0] - F(0.17), pair[0] + F(0.17), "Flash",
        { lengthFrames: F(0.34), intensity: pair[1], color: "#ffffff" },
        [{ key: "intensity", label: "Flash intensity", type: "number", defaultValue: 0.9, min: 0, max: 1, step: 0.05 }]);
    }
  }
  if (TITLE) {
    await d.addMotionGraphic({
      label: "Title card", tsxCode: GFX.card, durationSeconds: 1.4,
      parameters: { title: TITLE, subtitle: SUBTITLE, ink: "#f4f1ec", fontFamily: "" },
      editableParameters: [
        { key: "title", label: "Title", type: "text", defaultValue: TITLE },
        { key: "subtitle", label: "Subtitle", type: "text", defaultValue: SUBTITLE },
        { key: "ink", label: "Text colour", type: "color", defaultValue: "#f4f1ec" },
        { key: "fontFamily", label: "Font", type: "text", defaultValue: "" },
      ],
    });
  }
  if (LETTERBOX) {
    await addGfx(GFX.letterbox, 0, mainEnd(), "Cinemascope bars 2.39:1", { ratio: 2.39, frameRatio: 16 / 9 },
      [{ key: "ratio", label: "Aspect ratio", type: "number", defaultValue: 2.39, min: 1.6, max: 2.8, step: 0.01 }]);
  }
}

if (STYLE === "motion") {
  const hero = clips[0];
  const heroLen = hero.endFrame - hero.startFrame;
  await d.addVideoEffect({
    clip: hero, label: "Desk scene -> push in", tsxCode: GFX.desk,
    parameters: {
      holdFrames: Math.max(6, heroLen - F(0.75)),
      pushFrames: Math.min(F(0.75), Math.max(4, heroLen - 6)),
      paper: PALETTE.paper, surface: PALETTE.surface, accent: PALETTE.accent, chrome: PALETTE.chrome,
    },
    editableParameters: [
      { key: "holdFrames", label: "Hold (frames)", type: "number", defaultValue: 70, min: 0, max: 400, step: 1 },
      { key: "pushFrames", label: "Push-in (frames)", type: "number", defaultValue: 22, min: 4, max: 120, step: 1 },
      { key: "paper", label: "Room light", type: "color", defaultValue: PALETTE.paper },
      { key: "surface", label: "Room surface", type: "color", defaultValue: PALETTE.surface },
      { key: "accent", label: "Prop accent", type: "color", defaultValue: PALETTE.accent },
      { key: "chrome", label: "Device body", type: "color", defaultValue: PALETTE.chrome },
    ],
  });
  const anchor = clips[Math.min(1, clips.length - 1)];
  await d.insertGap({ at: { after: await d.rangeAtFrames(anchor.startFrame, anchor.endFrame) }, seconds: 2.0 });
  await addGfx(GFX.sky, anchor.endFrame, anchor.endFrame + F(2.0), "Sky flight",
    { lengthFrames: F(2.0), skyTop: PALETTE.skyTop, skyMid: PALETTE.skyMid, skyLow: PALETTE.paper, planeColor: PALETTE.deep, wingColor: PALETTE.surface },
    [
      { key: "skyTop", label: "Sky top", type: "color", defaultValue: PALETTE.skyTop },
      { key: "skyMid", label: "Sky middle", type: "color", defaultValue: PALETTE.skyMid },
      { key: "skyLow", label: "Horizon", type: "color", defaultValue: PALETTE.paper },
      { key: "planeColor", label: "Plane", type: "color", defaultValue: PALETTE.deep },
    ]);
  clips = (await d.clips({ trackScope: "main" })).filter(c => c.resourceId !== null);
  let chapters = [];
  try { chapters = await d.chapters(); } catch (e) { chapters = []; }
  const slots = clips.filter(c => c.endFrame - c.startFrame >= F(1.6)).slice(1, 3);
  for (const c of slots) {
    const ch = chapters.find(x => (x.startFrame ?? (x.span && x.span.startFrame)) <= c.startFrame && (x.endFrame ?? (x.span && x.span.endFrame)) > c.startFrame);
    const text = ch ? String(ch.title || ch.chapterTitle || "") : "";
    const label = text || SUBTITLE;
    if (!label) { notes.push("no chapter title for a label"); continue; }
    await addGfx(GFX.label, c.startFrame + F(0.2), c.endFrame, "Label - " + label,
      { text: label, sub: "", ink: PALETTE.paper, shadow: PALETTE.night, fontFamily: "" },
      [
        { key: "text", label: "Place", type: "text", defaultValue: label },
        { key: "sub", label: "Caption", type: "text", defaultValue: "" },
        { key: "ink", label: "Text colour", type: "color", defaultValue: PALETTE.paper },
        { key: "shadow", label: "Glow colour", type: "color", defaultValue: PALETTE.night },
      ]);
  }
  if (TITLE) {
    const last = clips[clips.length - 1];
    await addGfx(GFX.signoff, last.startFrame, last.endFrame, "Handwritten title",
      { title: TITLE, sub: SUBTITLE, ink: "#f6fafc", shadow: PALETTE.night, fontFamily: "" },
      [
        { key: "title", label: "Title", type: "text", defaultValue: TITLE },
        { key: "sub", label: "Subtitle", type: "text", defaultValue: SUBTITLE },
        { key: "ink", label: "Text colour", type: "color", defaultValue: "#f6fafc" },
        { key: "shadow", label: "Glow colour", type: "color", defaultValue: PALETTE.night },
      ]);
  }
}

if (STYLE === "quotes") {
  await d.addVideoEffect({
    clip: clips[0], label: "Iris open (cold open)", tsxCode: GFX.iris,
    parameters: { holdFrames: F(0.2), openFrames: F(0.55) },
    editableParameters: [
      { key: "holdFrames", label: "Hold before open", type: "number", defaultValue: 6, min: 0, max: 90, step: 1 },
      { key: "openFrames", label: "Open length", type: "number", defaultValue: 16, min: 4, max: 90, step: 1 },
    ],
  });
  if (TITLE) {
    await addGfx(GFX.showtitle, 0, Math.min(F(3.2), mainEnd()), "Show title",
      { title: TITLE, edition: SUBTITLE, ink: "#fbf7f0", fontFamily: "" },
      [
        { key: "title", label: "Title", type: "text", defaultValue: TITLE },
        { key: "edition", label: "Edition line", type: "text", defaultValue: SUBTITLE },
        { key: "ink", label: "Text colour", type: "color", defaultValue: "#fbf7f0" },
        { key: "fontFamily", label: "Font", type: "text", defaultValue: "" },
      ]);
    const mark = (SUBTITLE ? TITLE + " " + String.fromCharCode(183) + " " + SUBTITLE : TITLE).toLowerCase();
    await addGfx(GFX.mark, 0, mainEnd(), "Watermark", { text: mark, ink: "#fbf7f0" },
      [
        { key: "text", label: "Watermark text", type: "text", defaultValue: mark },
        { key: "ink", label: "Text colour", type: "color", defaultValue: "#fbf7f0" },
      ]);
  }
}

await d.commitAll("Vlog Opening: " + STYLE + " treatment");
const after = await d.clips({ trackScope: "all" });
return { notes, graphics: after.filter(c => c.trackKind === "video").length, mainEnd: after.filter(c => c.trackKind === "main").reduce((a, c) => Math.max(a, c.endFrame), 0) };
`;
}

function finishScript(opts: {
  sequenceId: string; fps: number; musicResourceId: string | null;
  muteSource: boolean; fadeSeconds: number; projectId: string; beats: any[];
}) {
  return `
const p = selects.project(${JSON.stringify(opts.projectId)});
const d = selects.draft(${JSON.stringify(opts.sequenceId)});
const BEATS: any[] = ${JSON.stringify(opts.beats)};
const MUSIC: string | null = ${JSON.stringify(opts.musicResourceId)};
const MUTE: boolean = ${opts.muteSource ? "true" : "false"};
const FADE_S: number = ${opts.fadeSeconds};
const fps: number = ${opts.fps};
const F = (s) => Math.max(1, Math.round(s * fps));
const notes = [];
const mainEnd = (rows) => rows.filter(c => c.trackKind === "main").reduce((a, c) => Math.max(a, c.endFrame), 0);
let rows = await d.clips({ trackScope: "all" });
if (MUTE) {
  try { await d.setAudioTracks({ target: await d.rangeAtFrames(0, mainEnd(rows)), audioSourceIndexes: [] }); }
  catch (e) { notes.push("location audio left as-is"); }
}
if (MUSIC) {
  rows = await d.clips({ trackScope: "all" });
  const total = rows.reduce((a, c) => Math.max(a, c.endFrame), 0);
  try { await d.overlayResource({ resource: p.resource(MUSIC), over: await d.rangeAtFrames(0, total), sourceStartSeconds: 0 }); }
  catch (e) { notes.push("music could not be placed"); }
}
if (FADE_S > 0) {
  rows = await d.clips({ trackScope: "all" });
  const total = rows.reduce((a, c) => Math.max(a, c.endFrame), 0);
  const len = Math.min(F(FADE_S), Math.max(2, Math.round(total / 4)));
  await d.addMotionGraphic({
    label: "Fade to black", tsxCode: ${JSON.stringify(GFX_FADE)},
    within: await d.rangeAtFrames(total - len, total),
    parameters: { lengthFrames: len, color: "#000000" },
    editableParameters: [{ key: "color", label: "Fade colour", type: "color", defaultValue: "#000000" }],
  });
}
await d.commitAll("Vlog Opening: music and fade");
const fin = await d.clips({ trackScope: "all" });
const total = fin.reduce((a, c) => Math.max(a, c.endFrame), 0);
const main = fin.filter(c => c.trackKind === "main" && c.resourceId !== null);
return {
  seconds: Math.round((total / fps) * 100) / 100,
  clips: main.length,
  graphics: fin.filter(c => c.trackKind === "video").length,
  music: fin.filter(c => c.trackKind === "audio").length > 0,
  notes,
  manifest: main.map((c, i) => ({
    i: i + 1,
    role: (BEATS[i] && BEATS[i].role) || "",
    name: (BEATS[i] && BEATS[i].name) || "",
    source: BEATS[i] ? BEATS[i].a + "-" + BEATS[i].b + "s" : "",
    text: (BEATS[i] && BEATS[i].text) || "",
    seconds: Math.round(((c.endFrame - c.startFrame) / fps) * 100) / 100,
  })),
};
`;
}

// ---------------------------------------------------------------------------
// Palette: sampled from the clips this build actually chose, so the graphics
// match the footage rather than a remembered reference.
// ---------------------------------------------------------------------------

const FALLBACK_PALETTE: Record<string, string> = {
  paper: "#eef3f6", surface: "#b9c8da", accent: "#a79289", chrome: "#3a3630",
  skyTop: "#4d7ec4", skyMid: "#7db9f2", deep: "#1f3a5f", night: "#132851",
};

function hexOf(r: number, g: number, b: number) {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}

function mix(c: number[], toward: number[], amount: number) {
  return [0, 1, 2].map(i => c[i] + (toward[i] - c[i]) * amount);
}

function paletteFromSamples(samples: number[][]): Record<string, string> {
  if (!samples.length) return { ...FALLBACK_PALETTE };
  const avg = [0, 1, 2].map(i => samples.reduce((a, s) => a + s[i], 0) / samples.length);
  const lum = (s: number[]) => 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  const sorted = samples.slice().sort((a, b) => lum(a) - lum(b));
  const dark = sorted[Math.floor(sorted.length * 0.1)];
  const light = sorted[Math.floor(sorted.length * 0.9)];
  const sat = (s: number[]) => Math.max(...s) - Math.min(...s);
  const vivid = samples.slice().sort((a, b) => sat(b) - sat(a))[0];
  return {
    paper: hexOf(...(mix(light, [255, 255, 255], 0.45) as [number, number, number])),
    surface: hexOf(...(mix(avg, [255, 255, 255], 0.35) as [number, number, number])),
    accent: hexOf(...(mix(vivid, [255, 255, 255], 0.15) as [number, number, number])),
    chrome: hexOf(...(mix(dark, [0, 0, 0], 0.25) as [number, number, number])),
    skyTop: hexOf(...(mix(avg, [40, 90, 170], 0.45) as [number, number, number])),
    skyMid: hexOf(...(mix(light, [120, 180, 240], 0.4) as [number, number, number])),
    deep: hexOf(...(mix(dark, [20, 45, 90], 0.35) as [number, number, number])),
    night: hexOf(...(mix(dark, [0, 0, 0], 0.55) as [number, number, number])),
  };
}

export default function Panel({ sdk, context, ui }: any) {
  const [style, setStyle] = React.useState<string>("whip");
  const [length, setLength] = React.useState<string>("standard");
  const [music, setMusic] = React.useState<string>("none");
  const [playing, setPlaying] = React.useState<string | null>(null);
  const audioRef = React.useRef<any>(null);
  const clipCache = React.useRef<Record<string, string>>({});
  const [making, setMaking] = React.useState<boolean>(false);
  const [letterbox, setLetterbox] = React.useState<boolean>(true);
  const [muteSource, setMuteSource] = React.useState<boolean>(true);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [step, setStep] = React.useState<string>("");
  const [status, setStatus] = React.useState<{ tone?: string; text: string } | null>(null);
  const [ready, setReady] = React.useState<any>(null);
  const [result, setResult] = React.useState<any>(null);
  // Scans are expensive; reuse them across builds in this session.
  const scanCache = React.useRef<Record<string, any[]>>({});

  const projectId = context?.projectId ?? null;

  React.useEffect(() => {
    setLetterbox(style === "whip");
    setMuteSource(style !== "quotes");
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(null);
  }, [style]);

  React.useEffect(() => () => { if (audioRef.current) audioRef.current.pause(); }, []);

  const loadReadiness = React.useCallback(async () => {
    if (!projectId) return;
    try {
      const r = await sdk.runScript({ summary: "Read project readiness", script: readinessScript(projectId), allowCommit: false });
      if (r.isError) { setStatus({ tone: "error", text: r.output }); return; }
      if (r.result == null) { setStatus({ tone: "error", text: "Could not read this project." }); return; }
      setReady(r.result);
    } catch (e: any) {
      setStatus({ tone: "error", text: "Could not read this project: " + String(e?.message ?? e) });
    }
  }, [projectId, sdk]);

  React.useEffect(() => { loadReadiness(); }, [loadReadiness]);

  const musicOptions = React.useMemo(() => {
    const opts = [{ value: "none", label: "No music" }];
    for (const a of ready?.audio ?? []) {
      opts.push({ value: "res:" + a.id, label: (playing === "res:" + a.id ? "\u266a " : "") + a.name });
    }
    return opts;
  }, [ready, playing]);


  function stopAudition() {
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = null;
    setPlaying(null);
  }

  function chooseMusic(value: string) {
    setMusic(value);
    stopAudition();
  }

  const selectedAudio = music.startsWith("res:")
    ? (ready?.audio ?? []).find((a: any) => a.id === music.slice(4)) || null
    : null;
  const canAudition = Boolean(selectedAudio && selectedAudio.path);

  function playClip(key: string, dataUri: string) {
    const next = new Audio(dataUri);
    next.onended = () => setPlaying(null);
    audioRef.current = next;
    next.play().then(() => setPlaying(key)).catch(() => setPlaying(null));
  }

  // Six seconds of whatever is selected. Bundled cues are embedded; a Project
  // audio file is encoded on demand, because a whole track cannot come back
  // through the shell's output limit.
  async function toggleAudition() {
    if (playing === music) { stopAudition(); return; }
    stopAudition();
    if (!selectedAudio || !selectedAudio.path) return;
    const cached = clipCache.current[music];
    if (cached) { playClip(music, cached); return; }
    setMaking(true);
    try {
      const from = Math.max(0, Math.min(12, (selectedAudio.seconds || 0) * 0.25));
      const cmd =
        "ffmpeg -nostdin -v error -ss " + from.toFixed(2) + " -t 6 -i " + JSON.stringify(selectedAudio.path) +
        " -ac 1 -ar 22050 -b:a 24k -af \"afade=t=in:st=0:d=0.2,afade=t=out:st=5.4:d=0.6\" -f mp3 - | base64 | tr -d '\\n'";
      const r = await sdk.runShell({ summary: "Make a preview of " + selectedAudio.name, command: cmd, timeoutMs: 30000, maxOutputBytes: 49152 });
      const b64 = String(r?.stdout ?? "").replace(/\s+/g, "");
      if (r?.isError || r?.truncated || b64.length < 200) {
        setStatus({ tone: "error", text: "Could not make a preview of " + selectedAudio.name + "." });
        return;
      }
      const uri = "data:audio/mpeg;base64," + b64;
      clipCache.current[music] = uri;
      playClip(music, uri);
    } catch (e: any) {
      setStatus({ tone: "error", text: "Preview failed: " + String(e?.message ?? e) });
    } finally {
      setMaking(false);
    }
  }

  const quotesBlocked = ready != null && (ready.withSpeech ?? 0) === 0;

  async function samplePalette(beats: any[]): Promise<Record<string, string>> {
    const withPath = beats.filter(b => b.path).slice(0, 6);
    if (!withPath.length) return { ...FALLBACK_PALETTE };
    const parts = withPath.map(b => {
      const mid = (Number(b.a) + Number(b.b)) / 2;
      return `ffmpeg -nostdin -v quiet -ss ${mid.toFixed(2)} -i ${JSON.stringify(b.path)} -frames:v 1 -vf "scale=4:3:flags=area,format=rgb24" -f rawvideo - 2>/dev/null | xxd -p -c 3`;
    });
    try {
      const r = await sdk.runShell({ summary: "Sample clip colours", command: parts.join("; "), timeoutMs: 120000 });
      const text = String(r?.stdout ?? r?.output ?? "");
      const samples: number[][] = [];
      for (const line of text.split(/\s+/)) {
        if (!/^[0-9a-f]{6}$/i.test(line)) continue;
        samples.push([parseInt(line.slice(0, 2), 16), parseInt(line.slice(2, 4), 16), parseInt(line.slice(4, 6), 16)]);
      }
      return samples.length ? paletteFromSamples(samples) : { ...FALLBACK_PALETTE };
    } catch (e) {
      return { ...FALLBACK_PALETTE };
    }
  }

  function resolveMusic(): { id: string | null; note: string } {
    if (music.startsWith("res:")) return { id: music.slice(4), note: "project audio" };
    return { id: null, note: "no music" };
  }

  async function build() {
    if (!projectId) { setStatus({ tone: "error", text: "Open a Project first." }); return; }
    setBusy(true); setStatus(null); setResult(null);
    try {
      const scale = LENGTH_SCALE[length] ?? 1;
      // Seeded from the Project name and edited later in the Inspector, where
      // every title, label and watermark is an editable parameter.
      const title = String(context?.projectName || "Opening").slice(0, 48);
      const subtitle = "";
      setStep("Choosing moments…");
      let beats: any[] = [];
      let dropped: any[] = [];
      let scanNotes: string[] = [];
      if (style === "quotes") {
        const budget = Math.round(22 * scale);
        const r = await sdk.runScript({ summary: "Find quotable lines", script: selectQuotesScript(projectId, budget, 30), allowCommit: false });
        if (r.isError) { setStatus({ tone: "error", text: r.output }); return; }
        if (r.result?.error === "no_speech") { setStatus({ tone: "error", text: "No analysed speech in this project, so the quotes style has nothing to cut." }); return; }
        if (r.result?.error === "no_analyzed_video") { setStatus({ tone: "error", text: "No analysed video in this project yet." }); return; }
        beats = r.result?.beats ?? [];
      } else {
        const template = TEMPLATES[style].map(b => ({ ...b, dur: b.fixed ? b.dur : Math.round(b.dur * scale * 100) / 100 }));
        setStep("Reading the footage…");
        const poolRun = await sdk.runScript({ summary: "Read footage pool", script: poolScript(projectId, style === "whip" ? 16 : 18), allowCommit: false });
        if (poolRun.isError) { setStatus({ tone: "error", text: poolRun.output }); return; }
        const pool = poolRun.result?.pool ?? [];
        if (!pool.length) { setStatus({ tone: "error", text: "No analysed landscape video in this project yet." }); return; }
        const rids = pool.map((r: any) => r.rid);
        const roles = Array.from(new Set(template.map((b: any) => b.role)));
        const hitsByRole: Record<string, any[]> = {};
        for (let i = 0; i < roles.length; i++) {
          const role = roles[i];
          setStep("Scanning footage " + (i + 1) + "/" + roles.length + "…");
          const cacheKey = projectId + "|" + role + "|" + rids.join(",");
          if (scanCache.current[cacheKey]) {
            hitsByRole[role] = scanCache.current[cacheKey];
            continue;
          }
          const rr = await sdk.runScript({
            summary: "Scan for " + role,
            script: searchRoleScript(projectId, ROLE_QUERIES[role] || role, rids),
            allowCommit: false,
          });
          if (rr.isError) { setStatus({ tone: "error", text: rr.output }); return; }
          hitsByRole[role] = rr.result?.hits ?? [];
          const failedCount = (rr.result?.failed ?? []).length;
          if (failedCount) scanNotes.push(failedCount + " clip(s) unreadable while scanning " + role);
          scanCache.current[cacheKey] = hitsByRole[role];
        }
        const assigned = assignBeats(template, hitsByRole, pool);
        beats = assigned.beats;
        dropped = assigned.dropped;
      }
      if (beats.length < 3) { setStatus({ tone: "error", text: "Only " + beats.length + " usable beat(s) found — this project needs more analysed footage." }); return; }

      setStep("Sampling colours…");
      const palette = style === "motion" ? await samplePalette(beats) : { ...FALLBACK_PALETTE };

      setStep("Preparing music…");
      const chosen = resolveMusic();

      const styleLabel = STYLES.find(s => s.value === style)?.label ?? style;
      const draftName = String(context?.projectName || "Opening") + " — Opening (" + styleLabel + ")";

      setStep("Assembling…");
      const asm = await sdk.runScript({ summary: "Assemble opening", allowCommit: true, script: assembleScript(projectId, draftName, beats) });
      if (asm.isError) { setStatus({ tone: "error", text: asm.output }); return; }
      if (asm.result == null || asm.result.error) { setStatus({ tone: "error", text: "Assembly failed: " + (asm.result?.error ?? "no result") }); return; }
      const sequenceId = asm.result.sequenceId as string;
      const fps = asm.result.fps as number;

      setStep("Adding the look…");
      const dec = await sdk.runScript({
        summary: "Style the opening", allowCommit: true,
        script: decorateScript({ sequenceId, style, fps, title, subtitle, letterbox, palette }),
      });
      if (dec.isError) { setStatus({ tone: "error", text: dec.output }); return; }

      setStep("Music and fade…");
      const fin = await sdk.runScript({
        summary: "Add music and fade", allowCommit: true,
        script: finishScript({ sequenceId, fps, musicResourceId: chosen.id, muteSource, fadeSeconds: FADE_SECONDS, projectId, beats }),
      });
      if (fin.isError) { setStatus({ tone: "error", text: fin.output }); return; }
      if (fin.result == null) { setStatus({ tone: "error", text: "The build finished but returned nothing to show." }); return; }

      const notes = [...scanNotes, ...(dec.result?.notes ?? []), ...(fin.result.notes ?? [])];
      setResult({ ...fin.result, notes, dropped, musicNote: chosen.note, sequenceId });
      const parts = [
        "Built " + fin.result.seconds + "s from " + fin.result.clips + " clips",
        fin.result.graphics + " graphic layer(s)",
        chosen.note,
      ];
      if (dropped.length) parts.push(dropped.length + " beat(s) dropped");
      setStatus({ text: parts.join(" · ") });
    } catch (e: any) {
      setStatus({ tone: "error", text: "Build failed: " + String(e?.message ?? e) });
    } finally {
      setBusy(false); setStep("");
    }
  }

  if (!projectId) {
    return <ui.Message tone="error">Open a Project to build an opening.</ui.Message>;
  }

  const blocked = style === "quotes" && quotesBlocked;

  return (
    <ui.Stack gap={16}>
      <div style={{ maxWidth: "var(--panel-field-max, 480px)" }}>
        <h3>Style</h3>
        <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
          {STYLES.map(s => {
            const on = style === s.value;
            const off = s.value === "quotes" && quotesBlocked;
            return (
              <div
                key={s.value}
                role="button"
                tabIndex={off ? -1 : 0}
                aria-pressed={on}
                aria-disabled={off}
                title={off ? s.label + " — needs analysed speech in this Project" : s.label + " — " + STYLE_BLURB[s.value]}
                onClick={() => { if (!off && !busy) setStyle(s.value); }}
                onKeyDown={(e: any) => { if (!off && !busy && (e.key === "Enter" || e.key === " ")) setStyle(s.value); }}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  border: "2px solid " + (on ? "var(--panel-accent)" : "transparent"),
                  borderRadius: "var(--panel-radius, 8px)",
                  overflow: "hidden",
                  cursor: off || busy ? "default" : "pointer",
                }}
              >
                {/* Selection reads as the bright one; the others sit back. */}
                <img
                  src={PREVIEWS[s.value]}
                  alt={s.label + " preview"}
                  style={{
                    width: "100%",
                    display: "block",
                    opacity: off ? 0.25 : on ? 1 : 0.55,
                    filter: on || off ? "none" : "saturate(0.7)",
                  }}
                />
                <div
                  style={{
                    padding: "3px 4px 4px",
                    textAlign: "center",
                    fontWeight: on ? 600 : 400,
                    color: off ? "var(--panel-muted-fg)" : on ? "var(--panel-fg)" : "var(--panel-muted-fg)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.short}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ui.Segmented
        label="Length"
        value={length}
        onChange={(v: string) => setLength(v)}
        options={LENGTHS.map(l => ({ value: l.value, label: l.label }))}
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: "var(--panel-field-max, 480px)" }}>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <ui.Select label="Music" value={music} onChange={chooseMusic} options={musicOptions} />
        </div>
        <ui.IconButton
          icon={making ? "loading" : playing === music ? "pause" : "play"}
          label={making ? "Preparing preview" : playing === music ? "Stop preview" : "Preview music"}
          disabled={!canAudition || making}
          onClick={toggleAudition}
        />
      </div>

      <ui.Toggle label="Cinematic black bars" value={letterbox} onChange={setLetterbox} />
      <ui.Toggle label="Mute location audio" value={muteSource} onChange={setMuteSource} />
      {blocked ? (
        <ui.Message tone="error">No analysed speech in this project, so the quotes style has nothing to cut.</ui.Message>
      ) : null}

      {busy ? <ui.Progress label={step || "Working"} /> : null}

      <ui.Actions>
        <ui.Button variant="primary" busy={busy} busyLabel="Building" onClick={build} disabled={busy || blocked}>
          Build opening
        </ui.Button>
      </ui.Actions>

      {status ? <ui.Message tone={status.tone === "error" ? "error" : "success"}>{status.text}</ui.Message> : null}

      {result && result.manifest && result.manifest.length ? (
        <ui.Section title="What it used">
          <ui.Stack gap={4}>
            {result.manifest.map((row: any) => (
              <ui.Row key={row.i} gap={8}>
                <span style={{ opacity: 0.55, minWidth: 20 }}>{row.i}</span>
                <span style={{ minWidth: 72, opacity: 0.75 }}>{row.role}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.text ? row.text : row.name}
                </span>
                <span style={{ opacity: 0.55 }}>{row.source}</span>
                <span style={{ opacity: 0.55, minWidth: 40, textAlign: "right" }}>{row.seconds}s</span>
              </ui.Row>
            ))}
            {result.notes && result.notes.length ? <ui.Message>{result.notes.join(" | ")}</ui.Message> : null}
            {result.dropped && result.dropped.length ? (
              <ui.Message>Dropped: {result.dropped.map((d: any) => d.role + " (" + d.reason + ")").join(", ")}</ui.Message>
            ) : null}
          </ui.Stack>
        </ui.Section>
      ) : null}
    </ui.Stack>
  );
}
