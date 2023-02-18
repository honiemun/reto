export default interface MessageEmbed {
    url?: string,
    color?: number,
    title?: string | null,
    description: string | undefined,
    timestamp: string,
    footer?: {
        text: string
    },
    author?: {
        name: string,
        icon_url: string | undefined
    },
    fields?: {
        name: string,
        value: string,
        inline?: boolean
    }[],
    image?: {
        url: string
    }
}