/**
 * This class allows you to create a webhook in our WooCommerce store
 * @type {AxiosStatic | {AxiosResponseTransformer: AxiosResponseTransformer, AxiosRequestConfig: AxiosRequestConfig, AxiosResponseHeaders: RawAxiosResponseHeaders & AxiosHeaders, CanceledError: CanceledError, TransitionalOptions: TransitionalOptions, CancelTokenStatic: CancelTokenStatic, formToJSON(form: (GenericFormData | GenericHTMLFormElement)): object, HttpStatusCode: HttpStatusCode, FormSerializerOptions: FormSerializerOptions, Axios: Axios, all<T>(values: Array<Promise<T> | T>): Promise<T[]>, FormDataVisitorHelpers: FormDataVisitorHelpers, responseEncoding: "ascii" | "ASCII" | "ansi" | "ANSI" | "binary" | "BINARY" | "base64" | "BASE64" | "base64url" | "BASE64URL" | "hex" | "HEX" | "latin1" | "LATIN1" | "ucs-2" | "UCS-2" | "ucs2" | "UCS2" | "utf-8" | "UTF-8" | "utf8" | "UTF8" | "utf16le" | "UTF16LE", AxiosInterceptorOptions: AxiosInterceptorOptions, toFormData(sourceObj: object, targetFormData?: GenericFormData, options?: FormSerializerOptions): GenericFormData, Method: "get" | "GET" | "delete" | "DELETE" | "head" | "HEAD" | "options" | "OPTIONS" | "post" | "POST" | "put" | "PUT" | "patch" | "PATCH" | "purge" | "PURGE" | "link" | "LINK" | "unlink" | "UNLINK", ResponseType: "arraybuffer" | "blob" | "document" | "json" | "text" | "stream", AxiosHeaders: AxiosHeaders, AxiosProgressEvent: AxiosProgressEvent, AxiosStatic: AxiosStatic, SerializerOptions: SerializerOptions, AxiosRequestTransformer: AxiosRequestTransformer, GenericAbortSignal: GenericAbortSignal, RawAxiosResponseHeaders: RawAxiosResponseHeaders, isAxiosError<T=any, D=any>(payload: any): payload is AxiosError<T, D>, AxiosHeaderValue: AxiosHeaders | string | string[] | number | boolean, AxiosRequestHeaders: RawAxiosRequestHeaders & AxiosHeaders, ParamsSerializerOptions: ParamsSerializerOptions, Canceler: Canceler, Cancel: Cancel, AxiosResponse: AxiosResponse, AxiosProxyConfig: AxiosProxyConfig, RawAxiosRequestHeaders: RawAxiosRequestHeaders, AxiosInstance: AxiosInstance, CancelTokenSource: CancelTokenSource, SerializerVisitor: SerializerVisitor, GenericFormData: GenericFormData, CreateAxiosDefaults: CreateAxiosDefaults, GenericHTMLFormElement: GenericHTMLFormElement, CancelToken: CancelToken, isCancel(value: any): value is Cancel, AxiosDefaults: AxiosDefaults, AxiosPromise: Promise<AxiosResponse<T>>, spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R, RawAxiosRequestConfig: AxiosRequestConfig<D>, InternalAxiosRequestConfig: InternalAxiosRequestConfig, HeadersDefaults: HeadersDefaults, AxiosInterceptorManager: AxiosInterceptorManager, ParamEncoder: ParamEncoder, AxiosError: AxiosError, CustomParamsSerializer: CustomParamsSerializer, AxiosBasicCredentials: AxiosBasicCredentials, CancelStatic: CancelStatic, AxiosAdapter: AxiosAdapter, readonly default: AxiosStatic} | axios.AxiosStatic | axios}
 */
const axios = require('axios');
const {pool} = require("./database/dbConfig");
const {logMessage, LogLevel} = require('./logger.js');

/**
 * This function updates the subscription table based on shop data
 */
async function updateSubscriptionTable() {
    axios.get('https://store.teamgenetix.ch/wp-json/gnxstore/v1/orders/', {
        params: {
            username: process.env.WP_USERNAME,
            password: process.env.WP_PASSWORD
        }
    })
        .then(async function (response) {
            const orders = response.data;
            const filteredOrders = orders.filter(order => {
                return order.status === 'wc-active' && order.type === 'hf_shop_subscription';
            });

            await pool.query('TRUNCATE TABLE "subscription"');

            for (const order of filteredOrders) {
                try {
                    // Get all products of this order
                    const productsResponse = await axios.get(`https://store.teamgenetix.ch/wp-json/gnxstore/v1/orderproducts/`, {
                        params: {
                            order_id: order.parent_order_id,
                            username: process.env.WP_USERNAME,
                            password: process.env.WP_PASSWORD
                        }
                    });

                    const products = productsResponse.data;
                    let subscriptionDefinition;

                    for (const product of products) {
                        const result = await pool.query('SELECT id FROM subscriptiondefinition WHERE wpproductid = $1', [product.product_id]);
                        if (result.rows.length > 0) {
                            subscriptionDefinition = result.rows[0].id;
                            break;
                        }
                    }
                    await pool.query('INSERT INTO subscription (account_fk, wporderid, wpemail, paymentdate, nextpaymentdate, subscriptiondefinition_fk) VALUES ((SELECT id FROM account WHERE wpuserid = $1), $2, $3, $4, $5, $6)', [order.customer_id, order.id, order.billing_email, order.paid_date, order.next_payment, subscriptionDefinition]);

                } catch (error) {
                    console.error(`Error fetching products for order ${order.id}: `, error);
                }
            }

            console.log('Subscription table updated');

        })
        .catch(function (error) {
            console.error("Error fetching orders: ", error);
        });
}

/**
 * This function refreshes the access token using the refresh token
 * @param refreshToken
 * @param userId
 * @returns {Promise<number|*>}
 */
async function refreshAccessToken(refreshToken, userId) {
    try {
        const response = await axios.post(`https://store.teamgenetix.ch/oauth/token`, {
            client_id: process.env.OAUTH_CLIENT_ID,
            client_secret: process.env.OAUTH_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error refreshing token:', error);
        logMessage('Error refreshing token from user ' + userId, LogLevel.ERROR, null)
        return -1;
    }
}


module.exports = {
    updateSubscriptionTable
}