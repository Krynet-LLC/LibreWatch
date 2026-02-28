// config.js
export const config = {
  Player: {
    UI: {
      default: "https://www.youtube-nocookie.com/embed/",
      Invidious: {
        "NerdVPN": "https://invidious.nerdvpn.de/embed/",
        "NerdVPN (Onion)": "http://nerdvpneaggggfdiurknszkbmhvjndks5z5k3g5yp4nhphflh3n3boad.onion/embed/",
        "Nadeko (I2P)": "http://nadekoohummkxncchcsylr3eku36ze4waq4kdrhcqupckc3pe5qq.b32.i2p/embed/",
        "Nadeko": "https://inv.nadeko.net/"
      },
      Piped: {
        "Piped": "https://piped.video/embed/",
        "Frontendprivacy": "https://pipedapi.frontendfriendly.xyz/embed/",
        "kavin.rocks": "https://pipedapi.kavin.rocks/embed/"
      }
    },
    Misc: {
      sponsorBlock: "https://sponsor.ajay.app/",
      dearrow: "https://dearrow.ajay.app/"
    },
    Proxy: {
      CorsProxy: "https://corsproxy.io/?url=",
      AllOriginsRaw: "https://api.allorigins.win/raw?url=",
      AllOriginsJSON: "https://api.allorigins.win/get?url=",
      CorsProxy2: "https://corsproxy.cyou/?url="
    },
    APIs: {
      API: "https://invidious.kavin.rocks/api/v1/"
    }
  }
};
