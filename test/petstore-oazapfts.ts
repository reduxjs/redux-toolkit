/**
 * Swagger Petstore
 * 1.0.0
 * DO NOT MODIFY - This file has been generated using oazapfts.
 * See https://www.npmjs.com/package/oazapfts
 */
import * as Oazapfts from "oazapfts/lib/runtime";
import * as QS from "oazapfts/lib/runtime/query";
export const defaults: Oazapfts.RequestOpts = {
    baseUrl: "http://petstore.swagger.io/v1",
};
const oazapfts = Oazapfts.runtime(defaults);
export const servers = {
    server1: "http://petstore.swagger.io/v1"
};
export type Pet = {
    id: number;
    name: string;
    tag?: string;
};
export type Pets = Pet[];
export type Error = {
    code: number;
    message: string;
};
/**
 * List all pets
 */
export function listPets({ limit }: {
    limit?: number;
} = {}, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: Pets;
    } | {
        status: number;
        data: Error;
    }>(`/pets${QS.query(QS.form({
        limit
    }))}`, {
        ...opts
    });
}
/**
 * Create a pet
 */
export function createPets(opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 201;
    } | {
        status: number;
        data: Error;
    }>("/pets", {
        ...opts,
        method: "POST"
    });
}
/**
 * Info for a specific pet
 */
export function showPetById(petId: string, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: Pet;
    } | {
        status: number;
        data: Error;
    }>(`/pets/${petId}`, {
        ...opts
    });
}
