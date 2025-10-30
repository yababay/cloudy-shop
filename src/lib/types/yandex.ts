export type NotificationType = 'ORDER_CREATED' | 'ORDER_STATUS_UPDATED' | 'ORDER_CANCELLED' | 'PING'
export type OrderStatusType = 'CANCELLED' | 'PROCESSING' | 'DELIVERED'
export type OrderSubtatusType = 'STARTED' | 'USER_CHANGED_MIND'

export type OrderDTO = {
    id: number
    orderId: number
    campaignId: number
    notificationType: NotificationType
    items: OrderItemDTO[]
    createdAt: string
    updatedAt: string
    status: OrderStatusType
    substatus: OrderSubtatusType
}

export type OrderItemDTO = {
    id: number
    count: number
    offerId: string
}

export type OrderDigitalItemDTO = {
    activate_till: string
    id: number
    slip: string
    codes: string[]    
}


/*export type Good = {
    activate_till: string
    slip: string
    id: number
    codes: string[]
}

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
}*/

