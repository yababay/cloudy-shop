export type NotificationType = 'ORDER_CREATED' | 'ORDER_STATUS_UPDATED' | 'ORDER_CANCELLED' | 'PING'
export type OrderStatus = 'CANCELLED' | 'PROCESSING' | 'DELIVERED'
export type OrderSubtatus = 'STARTED' | 'USER_CHANGED_MIND'

export type Item = {
    id: number
    offerId: string
    count: number
    code?: string
    slip?: string
}

export type Order = {
    orderId: number
    campaignId?: number
    notificationType?: NotificationType
    id?: number
    items?: Item[]
    status?: OrderStatus
    substatus?: OrderSubtatus
    createdAt?: Date
    updatedAt?: Date
    cancelledAt?: Date
}
