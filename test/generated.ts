import { createApi, fetchBaseQuery } from "@rtk-incubator/rtk-query";
export const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: "/api/v3" }),
    entityTypes: [],
    endpoints: build => ({
        updatePet: build.mutation<UpdatePetResponse, UpdatePetQueryArg>({
            query: queryArg => ({ url: `/pet`, body: queryArg.pet })
        }),
        addPet: build.mutation<AddPetResponse, AddPetQueryArg>({
            query: queryArg => ({ url: `/pet`, body: queryArg.pet })
        }),
        findPetsByStatus: build.query<FindPetsByStatusResponse, FindPetsByStatusQueryArg>({
            query: queryArg => ({ url: `/pet/findByStatus`, params: { status: queryArg.status } })
        }),
        findPetsByTags: build.query<FindPetsByTagsResponse, FindPetsByTagsQueryArg>({
            query: queryArg => ({ url: `/pet/findByTags`, params: { tags: queryArg.tags } })
        }),
        getPetById: build.query<GetPetByIdResponse, GetPetByIdQueryArg>({
            query: queryArg => ({ url: `/pet/${queryArg.petId}` })
        }),
        updatePetWithForm: build.mutation<UpdatePetWithFormResponse, UpdatePetWithFormQueryArg>({
            query: queryArg => ({ url: `/pet/${queryArg.petId}`, params: { name: queryArg.name, status: queryArg.status } })
        }),
        deletePet: build.mutation<DeletePetResponse, DeletePetQueryArg>({
            query: queryArg => ({ url: `/pet/${queryArg.petId}`, headers: { api_key: queryArg.apiKey } })
        }),
        uploadFile: build.mutation<UploadFileResponse, UploadFileQueryArg>({
            query: queryArg => ({ url: `/pet/${queryArg.petId}/uploadImage`, body: queryArg.body, params: { additionalMetadata: queryArg.additionalMetadata } })
        }),
        getInventory: build.query<GetInventoryResponse, GetInventoryQueryArg>({
            query: queryArg => ({ url: `/store/inventory` })
        }),
        placeOrder: build.mutation<PlaceOrderResponse, PlaceOrderQueryArg>({
            query: queryArg => ({ url: `/store/order`, body: queryArg.order })
        }),
        getOrderById: build.query<GetOrderByIdResponse, GetOrderByIdQueryArg>({
            query: queryArg => ({ url: `/store/order/${queryArg.orderId}` })
        }),
        deleteOrder: build.mutation<DeleteOrderResponse, DeleteOrderQueryArg>({
            query: queryArg => ({ url: `/store/order/${queryArg.orderId}` })
        }),
        createUser: build.mutation<CreateUserResponse, CreateUserQueryArg>({
            query: queryArg => ({ url: `/user`, body: queryArg.user })
        }),
        createUsersWithListInput: build.mutation<CreateUsersWithListInputResponse, CreateUsersWithListInputQueryArg>({
            query: queryArg => ({ url: `/user/createWithList`, body: queryArg.body })
        }),
        loginUser: build.query<LoginUserResponse, LoginUserQueryArg>({
            query: queryArg => ({ url: `/user/login`, params: { username: queryArg.username, password: queryArg.password } })
        }),
        logoutUser: build.query<LogoutUserResponse, LogoutUserQueryArg>({
            query: queryArg => ({ url: `/user/logout` })
        }),
        getUserByName: build.query<GetUserByNameResponse, GetUserByNameQueryArg>({
            query: queryArg => ({ url: `/user/${queryArg.username}` })
        }),
        updateUser: build.mutation<UpdateUserResponse, UpdateUserQueryArg>({
            query: queryArg => ({ url: `/user/${queryArg.username}`, body: queryArg.user })
        }),
        deleteUser: build.mutation<DeleteUserResponse, DeleteUserQueryArg>({
            query: queryArg => ({ url: `/user/${queryArg.username}` })
        })
    })
});
export type UpdatePetResponse = /** status 200 Successful operation */ Pet;
export type UpdatePetQueryArg = {
    /** Update an existent pet in the store */
    pet: Pet;
};
export type AddPetResponse = /** status 200 Successful operation */ Pet;
export type AddPetQueryArg = {
    /** Create a new pet in the store */
    pet: Pet;
};
export type FindPetsByStatusResponse = /** status 200 successful operation */ Pet[];
export type FindPetsByStatusQueryArg = {
    /** Status values that need to be considered for filter */
    status?: "available" | "pending" | "sold";
};
export type FindPetsByTagsResponse = /** status 200 successful operation */ Pet[];
export type FindPetsByTagsQueryArg = {
    /** Tags to filter by */
    tags?: string[];
};
export type GetPetByIdResponse = /** status 200 successful operation */ Pet;
export type GetPetByIdQueryArg = {
    /** ID of pet to return */
    petId: number;
};
export type UpdatePetWithFormResponse = unknown;
export type UpdatePetWithFormQueryArg = {
    /** ID of pet that needs to be updated */
    petId: number;
    /** Name of pet that needs to be updated */
    name?: string;
    /** Status of pet that needs to be updated */
    status?: string;
};
export type DeletePetResponse = unknown;
export type DeletePetQueryArg = {
    /**  */
    apiKey?: string;
    /** Pet id to delete */
    petId: number;
};
export type UploadFileResponse = /** status 200 successful operation */ ApiResponse;
export type UploadFileQueryArg = {
    /** ID of pet to update */
    petId: number;
    /** Additional Metadata */
    additionalMetadata?: string;
    /** undefined */
    body: string;
};
export type GetInventoryResponse = /** status 200 successful operation */ {
    [key: string]: number;
};
export type GetInventoryQueryArg = {};
export type PlaceOrderResponse = /** status 200 successful operation */ Order;
export type PlaceOrderQueryArg = {
    /** undefined */
    order: Order;
};
export type GetOrderByIdResponse = /** status 200 successful operation */ Order;
export type GetOrderByIdQueryArg = {
    /** ID of order that needs to be fetched */
    orderId: number;
};
export type DeleteOrderResponse = unknown;
export type DeleteOrderQueryArg = {
    /** ID of the order that needs to be deleted */
    orderId: number;
};
export type CreateUserResponse = unknown;
export type CreateUserQueryArg = {
    /** Created user object */
    user: User;
};
export type CreateUsersWithListInputResponse = /** status 200 Successful operation */ User;
export type CreateUsersWithListInputQueryArg = {
    /** undefined */
    body: User[];
};
export type LoginUserResponse = /** status 200 successful operation */ string;
export type LoginUserQueryArg = {
    /** The user name for login */
    username?: string;
    /** The password for login in clear text */
    password?: string;
};
export type LogoutUserResponse = unknown;
export type LogoutUserQueryArg = {};
export type GetUserByNameResponse = /** status 200 successful operation */ User;
export type GetUserByNameQueryArg = {
    /** The name that needs to be fetched. Use user1 for testing.  */
    username: string;
};
export type UpdateUserResponse = unknown;
export type UpdateUserQueryArg = {
    /** name that need to be deleted */
    username: string;
    /** Update an existent user in the store */
    user: User;
};
export type DeleteUserResponse = unknown;
export type DeleteUserQueryArg = {
    /** The name that needs to be deleted */
    username: string;
};
export type Category = {
    id?: number;
    name?: string;
};
export type Tag = {
    id?: number;
    name?: string;
};
export type Pet = {
    id?: number;
    name: string;
    category?: Category;
    photoUrls: string[];
    tags?: Tag[];
    status?: "available" | "pending" | "sold";
};
export type ApiResponse = {
    code?: number;
    "type"?: string;
    message?: string;
};
export type Order = {
    id?: number;
    petId?: number;
    quantity?: number;
    shipDate?: string;
    status?: "placed" | "approved" | "delivered";
    complete?: boolean;
};
export type User = {
    id?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    phone?: string;
    userStatus?: number;
};

