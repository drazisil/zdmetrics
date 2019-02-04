import * as dotenvSafe from 'dotenv-safe'
import moment from 'moment'
import * as inquirer from 'inquirer'
import * as request from 'request'

dotenvSafe.config()

interface IProcessEnvs {
  ZENDESK_EMAIL: string | undefined
  ZENDESK_API_TOKEN: string | undefined
  ZENDESK_URL: string | undefined
}

const { ZENDESK_EMAIL, ZENDESK_API_TOKEN, ZENDESK_URL } = process.env

export async function cliGetFromDate() {
  const prompt = inquirer.createPromptModule()
  return prompt([
    {
      default: moment()
        .subtract(30, 'days')
        .format('YYYY-MM-DD'),
      message: 'Fetch ticket comments from what date?',
      name: 'fromDate',
      type: 'input',
      validate(value) {
        const pass = value.match(/([0-9]+)-([0-9]+)-([0-9]+)/)
        if (pass) {
          return true
        }

        return 'Please enter a valid date in the form YYYY-MM-DD'
      }
    }
  ])
}

export function generateSearchQuery(zendeskUrl: any, fromTimestamp: number) {
  return `${zendeskUrl}/api/v2/incremental/ticket_events.json?start_time=${fromTimestamp}&include=comment_events`
}

export async function fetchTicketEvents(
  ticketsEvents: any[],
  url: string,
  zendeskEmail: any,
  zendeskApiToken: any
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    request.get(
      url,
      {
        auth: {
          pass: zendeskApiToken,
          sendImmediately: false,
          user: `${zendeskEmail}/token`
        }
      },
      async (error, response, body) => {
        if (error) {
          reject(error)
        }
        const info = JSON.parse(body)
        if (info.error) {
          reject(info.error)
        }
        ticketsEvents = ticketsEvents.concat(info.ticket_events)
        // if (info.next_page && info.count === 1000) {
        //   resolve(
        //     await fetchTicketEvents(
        //       ticketsEvents,
        //       info.next_page,
        //       zendeskEmail,
        //       zendeskApiToken
        //     )
        //   )
        // }
        resolve(ticketsEvents)
      }
    )
  })
}

async function main() {
  const url = generateSearchQuery(
    ZENDESK_URL,
    moment()
      .subtract(30, 'days')
      .unix()
  )

  const response: any = await fetchTicketEvents(
    [],
    url,
    ZENDESK_EMAIL,
    ZENDESK_API_TOKEN
  ).catch(err => {
    console.log(err)
    process.exit()
  })
  const ticketEvents = response

  ticketEvents.forEach((event: any) => {
    const { updater_id, timestamp } = event
    console.log(
      `Updater ID: ${updater_id}, Last Updated: ${moment
        .unix(timestamp)
        .format()}`
    )
  })
}

main()
