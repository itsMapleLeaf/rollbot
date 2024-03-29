// @ts-check
import {
  buttonComponent,
  createGatekeeper,
  defineSlashCommand,
} from "@itsmapleleaf/gatekeeper"
import { Client, Intents } from "discord.js"
import "dotenv/config.js"

const isPositiveInteger = (/** @type {number} */ value) =>
  Number.isSafeInteger(value) && value > 0

/**
 * @typedef {{ type:'roll'|'ignored', dieString: string,rolls:number[] }} RollResult
 */

/**
 * @param {string} diceString
 */
function rollDice(diceString) {
  /**
   * @type {RollResult[]}
   */
  const results = []

  for (const dieString of diceString.split(/\s+/)) {
    try {
      const [count, size] = dieString.split("d").map(Number)

      const isValid = isPositiveInteger(count) && isPositiveInteger(size)
      if (!isValid) {
        results.push({ type: "ignored", dieString, rolls: [] })
        continue
      }

      const rolls = Array(count)
        .fill(0)
        .map(() => Math.floor(Math.random() * size) + 1)

      results.push({ type: "roll", dieString, rolls: rolls })
    } catch (error) {
      results.push({ type: "ignored", dieString, rolls: [] })
    }
  }

  return results
}

const rollCommand = defineSlashCommand({
  name: "roll",
  description: "rolls a dice",
  options: {
    dice: {
      type: "STRING",
      description: "dice to roll",
    },
  },
  run(context) {
    const diceString = context.options.dice || "1d6"

    createRollReply()

    /**
     * @param {string=} rerollingUserId
     */
    function createRollReply(rerollingUserId) {
      const results = rollDice(diceString)

      const resultOutputs = results.map((result) =>
        result.type === "roll"
          ? `:game_die: **${result.dieString}** ⇒ ${result.rolls.join(", ")}`
          : `Ignored: ${result.dieString}`
      )

      const allRolls = results.flatMap((result) => result.rolls)
      const total = allRolls.reduce((total, value) => total + value, 0)

      const reply = context.reply(() => [
        rerollingUserId && `(rerolled by <@${rerollingUserId}>)\n`,
        resultOutputs,
        allRolls.length > 1 && `**Total:** ${total}`,
        buttonComponent({
          label: "",
          emoji: "🎲",
          style: "PRIMARY",
          onClick: (context) => createRollReply(context.user.id),
        }),
        buttonComponent({
          label: "",
          emoji: "❌",
          style: "SECONDARY",
          onClick: (event) => {
            if (event.user.id === (rerollingUserId || context.user.id)) {
              reply.delete()
            } else {
              event.ephemeralReply(
                () => `sorry, only the owner of the roll can delete this!`
              )
            }
          },
        }),
      ])
    }
  },
})

const client = new Client({
  intents: [Intents.FLAGS.GUILDS],
})

const gatekeeper = createGatekeeper({ debug: true })
gatekeeper.addCommand(rollCommand)
gatekeeper.useClient(client)

await client.login(process.env.BOT_TOKEN).catch(console.error)
